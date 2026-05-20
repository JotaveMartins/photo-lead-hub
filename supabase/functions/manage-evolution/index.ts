import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return new Response("Unauthorized", { status: 401 });

    const { action, instanceName, instanceId, targetInstanceId } = await req.json();
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "evolution")
      .maybeSingle();
    const settings: any = settingsRow?.value || {};
    const baseUrl = (settings.base_url || Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const apiKey = settings.api_key || Deno.env.get("EVOLUTION_API_KEY");

    if (!baseUrl || !apiKey) {
      throw new Error("Evolution API URL or Key not configured. Set them under Admin → Configurações.");
    }

    if (action === "test-connection") {
      const resp = await fetch(`${baseUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
      });
      const text = await resp.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      if (!resp.ok) {
        return new Response(
          JSON.stringify({ ok: false, status: resp.status, error: parsed?.message || text.slice(0, 300) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const count = Array.isArray(parsed) ? parsed.length : 0;
      return new Response(
        JSON.stringify({ ok: true, status: resp.status, instances: count, baseUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-or-get-qr") {
      console.log(`Action: create-or-get-qr for ${instanceName}`);

      // 1. Check if instance exists
      const stateResp = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey },
      });

      let qrcode = null;

      if (stateResp.status === 404) {
        console.log("Instance not found, creating...");
        const createResp = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": apiKey },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });

        if (!createResp.ok) {
          const errData = await createResp.json();
          throw new Error(`Failed to create instance: ${JSON.stringify(errData)}`);
        }

        const createData = await createResp.json();
        qrcode = createData?.qrcode?.base64 || createData?.base64;
      } else {
        const stateData = await stateResp.json();
        if (stateData?.instance?.state === "open") {
          return new Response(JSON.stringify({ status: "connected" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const connectResp = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          headers: { apikey: apiKey },
        });
        const connectData = await connectResp.json();
        qrcode = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code;
      }

      // Always (re)configure webhook — covers instances created before webhook code existed
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-webhook`;
      const events = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"];
      // Evolution API v2 expects payload wrapped in { webhook: {...} }
      const whResp = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: false,
            events,
          }
        })
      });
      if (!whResp.ok) {
        // Fallback to flat payload (older Evolution versions)
        await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": apiKey },
          body: JSON.stringify({ url: webhookUrl, enabled: true, events })
        });
      }
      console.log("Webhook configured for", instanceName, "→", webhookUrl, "status:", whResp.status);

      const updateQuery = supabase.from("whatsapp_instances")
        .update({ instance_key: instanceName, status: "connecting" });
      if (instanceId) updateQuery.eq("id", instanceId);
      else updateQuery.eq("user_id", user.id).eq("name", instanceName);
      await updateQuery;

      return new Response(JSON.stringify({ qrcode, status: "connecting" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "check-status") {
      const stateResp = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey },
      });
      if (!stateResp.ok) {
        return new Response(JSON.stringify({ status: "disconnected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const stateData = await stateResp.json();
      const state = stateData?.instance?.state || stateData?.state;
      let phoneNumber: string | null = null;
      if (state === "open") {
        try {
          const listResp = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`, {
            headers: { apikey: apiKey },
          });
          const listData = await listResp.json();
          const inst = Array.isArray(listData) ? listData[0] : listData;
          const ownerJid = inst?.instance?.owner || inst?.ownerJid || inst?.owner || inst?.instance?.ownerJid;
          if (ownerJid) phoneNumber = String(ownerJid).split("@")[0];
        } catch (_) { /* ignore */ }
        const upd = supabase.from("whatsapp_instances")
          .update({ status: "connected", phone_number: phoneNumber, instance_key: instanceName });
        if (instanceId) upd.eq("id", instanceId);
        else upd.eq("user_id", user.id).eq("name", instanceName);
        await upd;
      }
      return new Response(JSON.stringify({ status: state === "open" ? "connected" : "connecting", phoneNumber }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "disconnect") {
      try {
        await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: "DELETE",
          headers: { apikey: apiKey },
        });
      } catch (_) { /* ignore */ }
      const upd = supabase.from("whatsapp_instances")
        .update({ status: "disconnected", phone_number: null });
      if (instanceId) upd.eq("id", instanceId);
      else upd.eq("user_id", user.id).eq("name", instanceName);
      await upd;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "delete") {
      // Try logout then delete on Evolution
      try {
        await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: "DELETE", headers: { apikey: apiKey },
        });
      } catch (_) { /* ignore */ }
      try {
        await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: "DELETE", headers: { apikey: apiKey },
        });
      } catch (_) { /* ignore */ }

      // Delete linked inbox conversations + messages
      if (instanceId) {
        const { data: convs } = await supabase
          .from("inbox_conversations").select("id").eq("instance_id", instanceId);
        const convIds = (convs || []).map((c: any) => c.id);
        if (convIds.length) {
          await supabase.from("inbox_messages").delete().in("conversation_id", convIds);
          await supabase.from("inbox_conversations").delete().in("id", convIds);
        }
        await supabase.from("whatsapp_instances").delete().eq("id", instanceId);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "transfer") {
      // Move all conversations (and messages via FK) from instanceId -> targetInstanceId
      if (!instanceId || !targetInstanceId) {
        throw new Error("instanceId and targetInstanceId are required");
      }
      const { error: tErr } = await supabase
        .from("inbox_conversations")
        .update({ instance_id: targetInstanceId })
        .eq("instance_id", instanceId)
        .eq("user_id", user.id);
      if (tErr) throw tErr;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "set-webhook") {
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-webhook`;
      const events = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"];
      const whResp = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiKey },
        body: JSON.stringify({
          webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: false, events }
        })
      });
      let body = await whResp.text();
      if (!whResp.ok) {
        const fallback = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": apiKey },
          body: JSON.stringify({ url: webhookUrl, enabled: true, events })
        });
        body = await fallback.text();
        if (!fallback.ok) throw new Error(`Webhook set failed: ${body}`);
      }
      return new Response(JSON.stringify({ ok: true, webhookUrl, response: body }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  } catch (err) {
    console.error("Error in manage-evolution:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
