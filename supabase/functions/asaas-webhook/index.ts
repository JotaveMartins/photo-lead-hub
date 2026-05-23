import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de eventos/status do Asaas para status do CRM
const STATUS_MAP: Record<string, string> = {
  PAYMENT_RECEIVED: "paga",
  PAYMENT_CONFIRMED: "paga",
  PAYMENT_OVERDUE: "vencida",
  PAYMENT_UPDATED: "", // ignora
  PAYMENT_DELETED: "", // ignora
  PAYMENT_AWAITING_RISK_ANALYSIS: "aguardando",
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: "aguardando",
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: "vencida",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    console.log("Asaas webhook received:", JSON.stringify(payload));

    const event: string = payload.event ?? "";
    const payment = payload.payment ?? {};
    const asaasId: string = payment.id ?? "";

    if (!asaasId) return json({ ok: true, message: "Sem payment.id, ignorado" });

    const newStatus = STATUS_MAP[event];
    if (!newStatus) return json({ ok: true, message: `Evento ${event} ignorado` });

    // Encontra cobranças pelo asaas_id
    const { data: cobrancas, error } = await supabase
      .from("cobrancas")
      .select("id, status")
      .eq("asaas_id", asaasId);

    if (error) throw error;
    if (!cobrancas?.length) return json({ ok: true, message: "Nenhuma cobrança encontrada para este asaas_id" });

    const ids = cobrancas.map((c: any) => c.id);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "paga") updates.data_pagamento = new Date().toISOString().split("T")[0];

    const { error: updateErr } = await supabase
      .from("cobrancas")
      .update(updates as any)
      .in("id", ids);

    if (updateErr) throw updateErr;

    console.log(`${ids.length} cobrança(s) atualizadas para "${newStatus}" via Asaas webhook`);
    return json({ ok: true, updated: ids.length });
  } catch (err) {
    console.error("asaas-webhook error:", err);
    return json({ error: String(err) }, 500);
  }
});
