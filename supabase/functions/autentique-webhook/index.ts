import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-autentique-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    console.log("Autentique webhook received:", JSON.stringify(payload));

    // Autentique sends events like: { event: "document.signed", document: { id: "...", ... } }
    const event: string = payload.event || payload.type || "";
    const documentId: string =
      payload.document?.id ||
      payload.data?.document?.id ||
      payload.id ||
      "";

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "document id not found in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSigned =
      event.includes("signed") ||
      event.includes("completed") ||
      event.includes("finalizado");

    if (!isSigned) {
      return new Response(
        JSON.stringify({ ok: true, message: "Event ignored: not a signing event", event }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the contract linked to this Autentique document
    const { data: contratos, error: fetchError } = await supabase
      .from("contratos")
      .select("id, status")
      .eq("autentique_document_id", documentId);

    if (fetchError) throw fetchError;

    if (!contratos || contratos.length === 0) {
      console.log("No contrato found for autentique_document_id:", documentId);
      return new Response(
        JSON.stringify({ ok: true, message: "No contrato found for this document" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update all matching contracts to assinado
    const ids = contratos.map((c) => c.id);
    const { error: updateError } = await supabase
      .from("contratos")
      .update({ status: "contrato_assinado" })
      .in("id", ids);

    if (updateError) throw updateError;

    console.log(`Marked ${ids.length} contrato(s) as assinado for document ${documentId}`);

    return new Response(
      JSON.stringify({ ok: true, updated: ids.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("autentique-webhook error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
