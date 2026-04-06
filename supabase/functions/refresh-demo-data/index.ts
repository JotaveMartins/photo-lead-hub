import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEMO_USER_ID = "c8efc0bc-3370-49fc-b9f3-2166f782fe65";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is the demo admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user || user.id !== DEMO_USER_ID) {
      return new Response(JSON.stringify({ error: "Not demo user" }), { status: 403, headers: corsHeaders });
    }

    const today = new Date();
    const toDateStr = (d: Date) => d.toISOString().split("T")[0];
    const addDays = (d: Date, n: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    };

    // 1. Update pending tasks with relative dates spread around today
    const { data: tasks } = await supabase
      .from("lead_tasks")
      .select("id, title")
      .eq("user_id", DEMO_USER_ID)
      .eq("completed", false)
      .order("created_at");

    if (tasks && tasks.length > 0) {
      // Distribute tasks: some overdue (-3,-2,-1), some today (0), some future (+1,+2,+3)
      const offsets = [-3, -2, -1, 0, 0, 1, 1, 2, 3, 5, 7, 10, 14, 21, 28, 30, 35];
      for (let i = 0; i < tasks.length; i++) {
        const offset = offsets[i % offsets.length];
        await supabase
          .from("lead_tasks")
          .update({ due_date: toDateStr(addDays(today, offset)) })
          .eq("id", tasks[i].id);
      }
    }

    // 2. Update event dates to be spread in upcoming weeks
    const { data: events } = await supabase
      .from("events")
      .select("id")
      .eq("user_id", DEMO_USER_ID)
      .is("deleted_at", null)
      .order("created_at");

    if (events && events.length > 0) {
      const eventOffsets = [3, 7, 10, 14, 21, 30, 45, 60];
      for (let i = 0; i < events.length; i++) {
        const offset = eventOffsets[i % eventOffsets.length];
        const eventDate = addDays(today, offset);
        eventDate.setHours(10 + (i % 8), 0, 0, 0);
        await supabase
          .from("events")
          .update({ data_evento: eventDate.toISOString() })
          .eq("id", events[i].id);
      }
    }

    // 3. Update cobranca dates to be relative
    const { data: cobrancas } = await supabase
      .from("cobrancas")
      .select("id, status")
      .eq("user_id", DEMO_USER_ID)
      .is("deleted_at", null)
      .order("created_at");

    if (cobrancas && cobrancas.length > 0) {
      for (let i = 0; i < cobrancas.length; i++) {
        const c = cobrancas[i];
        let vencOffset: number;
        let pagamento: string | null = null;

        if (c.status === "paga") {
          vencOffset = -(15 - i * 3); // past dates
          pagamento = toDateStr(addDays(today, vencOffset + 1));
        } else if (c.status === "vencida") {
          vencOffset = -(3 + i); // overdue
        } else {
          vencOffset = 5 + i * 7; // future
        }

        const updateData: Record<string, unknown> = {
          vencimento: toDateStr(addDays(today, vencOffset)),
        };
        if (pagamento) updateData.data_pagamento = pagamento;

        await supabase
          .from("cobrancas")
          .update(updateData)
          .eq("id", c.id);
      }
    }

    // 4. Update despesa dates to be relative
    const { data: despesas } = await supabase
      .from("despesas")
      .select("id, status")
      .eq("user_id", DEMO_USER_ID)
      .is("deleted_at", null)
      .order("created_at");

    if (despesas && despesas.length > 0) {
      for (let i = 0; i < despesas.length; i++) {
        const d = despesas[i];
        const offset = d.status === "paga" ? -(20 - i * 3) : 5 + i * 5;
        await supabase
          .from("despesas")
          .update({ data: toDateStr(addDays(today, offset)) })
          .eq("id", despesas[i].id);
      }
    }

    // 5. Update lead dates (data_pedido, data_proposta, data_evento) to be recent
    const { data: activeLeads } = await supabase
      .from("leads")
      .select("id, status")
      .eq("user_id", DEMO_USER_ID)
      .is("deleted_at", null)
      .in("status", ["Contato Iniciado", "Proposta Enviada", "Follow-up", "Contrato Enviado", "Novo Lead"])
      .order("created_at");

    if (activeLeads && activeLeads.length > 0) {
      for (let i = 0; i < activeLeads.length; i++) {
        const pedidoOffset = -(30 - i);
        const updateData: Record<string, unknown> = {
          data_pedido: toDateStr(addDays(today, pedidoOffset)),
        };

        const lead = activeLeads[i];
        if (["Proposta Enviada", "Follow-up", "Contrato Enviado"].includes(lead.status)) {
          updateData.data_proposta = toDateStr(addDays(today, pedidoOffset + 3));
        }
        if (lead.status === "Contrato Enviado" || lead.status === "Follow-up") {
          updateData.data_evento = toDateStr(addDays(today, 60 + i * 15));
        }

        await supabase
          .from("leads")
          .update(updateData)
          .eq("id", lead.id);
      }
    }

    return new Response(JSON.stringify({ success: true, updated: { tasks: tasks?.length, events: events?.length, cobrancas: cobrancas?.length, despesas: despesas?.length, leads: activeLeads?.length } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
