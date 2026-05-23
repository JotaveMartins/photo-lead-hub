import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://api.asaas.com/v3";

const BILLING_TYPE: Record<string, string> = {
  pix: "PIX",
  boleto: "BOLETO",
  cartao: "CREDIT_CARD",
  transferencia: "PIX",
  dinheiro: "UNDEFINED",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Valida JWT do usuário
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Não autorizado" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(jwt);
    if (authErr || !user) return json({ error: "Não autorizado" }, 401);

    // Cliente com service role para operações de DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { cobranca_id } = await req.json();
    if (!cobranca_id) return json({ error: "cobranca_id obrigatório" }, 400);

    // Busca cobrança + cliente
    const { data: cobranca, error: cErr } = await supabase
      .from("cobrancas")
      .select("*, clientes(*)")
      .eq("id", cobranca_id)
      .eq("user_id", user.id)
      .single();
    if (cErr || !cobranca) return json({ error: "Cobrança não encontrada" }, 404);

    // Busca token Asaas do tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("asaas_api_key")
      .eq("user_id", user.id)
      .single();
    if (!profile?.asaas_api_key) return json({ error: "Token Asaas não configurado. Acesse Integrações e adicione seu token." }, 400);

    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": profile.asaas_api_key,
    };

    // Cria ou encontra cliente no Asaas
    const cliente = (cobranca as any).clientes;
    if (!cliente) return json({ error: "A cobrança precisa ter um cliente vinculado para enviar ao Asaas" }, 400);

    let customerId: string | null = null;

    // Tenta encontrar pelo CPF/CNPJ
    if (cliente.cpf_cnpj) {
      const cpfClean = cliente.cpf_cnpj.replace(/\D/g, "");
      const searchRes = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpfClean}`, { headers: asaasHeaders });
      const searchData = await searchRes.json();
      if (searchData.data?.length > 0) customerId = searchData.data[0].id;
    }

    // Se não encontrou, cria
    if (!customerId) {
      const createRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          name: cliente.nome,
          cpfCnpj: cliente.cpf_cnpj ? cliente.cpf_cnpj.replace(/\D/g, "") : undefined,
          email: cliente.email || undefined,
          phone: cliente.whatsapp ? cliente.whatsapp.replace(/\D/g, "") : undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) return json({ error: `Erro ao criar cliente no Asaas: ${createData.errors?.[0]?.description || JSON.stringify(createData)}` }, 400);
      customerId = createData.id;
    }

    // Cria a cobrança no Asaas
    const billingType = BILLING_TYPE[cobranca.forma_pagamento] || "UNDEFINED";
    const chargeRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value: cobranca.valor,
        dueDate: cobranca.vencimento,
        description: cobranca.descricao || undefined,
      }),
    });
    const chargeData = await chargeRes.json();
    if (!chargeRes.ok) return json({ error: `Erro ao criar cobrança no Asaas: ${chargeData.errors?.[0]?.description || JSON.stringify(chargeData)}` }, 400);

    const asaasId: string = chargeData.id;
    const invoiceUrl: string | null = chargeData.invoiceUrl || null;
    const billetUrl: string | null = chargeData.bankSlipUrl || null;

    // Busca QR Code PIX se for PIX
    let pixCode: string | null = null;
    if (billingType === "PIX") {
      const pixRes = await fetch(`${ASAAS_BASE}/payments/${asaasId}/pixQrCode`, { headers: asaasHeaders });
      if (pixRes.ok) {
        const pixData = await pixRes.json();
        pixCode = pixData.payload || null;
      }
    }

    // Atualiza cobrança com dados do Asaas
    await supabase
      .from("cobrancas")
      .update({ asaas_id: asaasId, asaas_invoice_url: invoiceUrl, asaas_billet_url: billetUrl, asaas_pix_code: pixCode } as any)
      .eq("id", cobranca_id);

    console.log(`Cobrança ${cobranca_id} sincronizada com Asaas: ${asaasId}`);

    return json({ ok: true, asaas_id: asaasId, invoice_url: invoiceUrl, pix_code: pixCode });
  } catch (err) {
    console.error("asaas-create-charge error:", err);
    return json({ error: String(err) }, 500);
  }
});
