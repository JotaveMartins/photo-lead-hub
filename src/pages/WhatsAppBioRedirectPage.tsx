import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Bio visitors never depend on a CRM session, even if an expired session exists.
const publicClient = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
import { validBioSlug, whatsappBioTarget } from "@/lib/whatsappBioLink";

export default function WhatsAppBioRedirectPage() {
  const { slug = "" } = useParams();
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setTarget(null);
    async function open() {
      try {
        if (!validBioSlug(slug)) throw new Error("invalid");
        const { data, error } = await publicClient.rpc("resolve_whatsapp_bio_link", { p_slug: slug }).abortSignal(AbortSignal.timeout(10000));
        if (error || data?.length !== 1) throw new Error("unavailable");
        const url = whatsappBioTarget(data[0].phone, data[0].message);
        if (!cancelled) { setTarget(url); window.location.replace(url); }
      } catch { if (!cancelled) setFailed(true); }
    }
    void open();
    return () => { cancelled = true; };
  }, [slug]);
  return <main className="min-h-screen flex items-center justify-center p-6 text-center">
    {failed ? <p>Este link de WhatsApp está indisponível. Entre em contato com a empresa pelo perfil do Instagram.</p>
      : <div className="space-y-3"><p>Abrindo WhatsApp...</p>{target && <a className="text-primary underline" href={target}>Abrir WhatsApp</a>}</div>}
  </main>;
}
