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

    const { action, instanceName } = await req.json();
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

    if (action === "create-or-get-qr") {
      console.log(`Action: create-or-get-qr for ${instanceName}`);
      
      // 1. Check if instance exists
      const stateResp = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey },
      });

      let qrcode = null;

      if (stateResp.status === 404) {
        console.log("Instance not found, creating...");
        // Create it
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

        // Set webhook
        const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-webhook`;
        await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": apiKey },
          body: JSON.stringify({ 
            url: webhookUrl, 
            enabled: true, 
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"] 
          })
        });
      } else {
        const stateData = await stateResp.json();
        if (stateData?.instance?.state === "open") {
          return new Response(JSON.stringify({ status: "connected" }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        console.log("Instance exists but not connected, requesting QR...");
        // If exists, get QR
        const connectResp = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          headers: { apikey: apiKey },
        });
        const connectData = await connectResp.json();
        qrcode = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code;
      }

      return new Response(JSON.stringify({ qrcode, status: "connecting" }), { 
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
