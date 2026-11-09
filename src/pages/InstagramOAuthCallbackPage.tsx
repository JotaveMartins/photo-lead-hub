import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { instagramErrorMessage } from "@/lib/instagramOAuth";

const InstagramOAuthCallbackPage = () => {
  const [params] = useSearchParams();
  const success = params.get("result") === "success";
  const reason = params.get("reason");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "instagram-auth", success, reason }, window.location.origin);
        if (success) timer = setTimeout(() => window.close(), 1500);
      }
    } catch { /* The return link remains usable if the opener is unavailable. */ }
    return () => { if (timer) clearTimeout(timer); };
  }, [success, reason]);

  return <main className="min-h-screen bg-background flex items-center justify-center p-6">
    <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center space-y-4">
      {success ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /> : <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />}
      <h1 className="text-xl font-semibold text-foreground">{success ? "Instagram conectado!" : "Não foi possível conectar"}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{success ? "A conexão foi salva. Você já pode voltar ao CRM. Esta janela será fechada automaticamente quando possível." : instagramErrorMessage(reason)}</p>
      <Button className="w-full" onClick={() => window.close()}>Fechar janela</Button>
      <Button variant="outline" className="w-full" asChild><Link to="/integracoes">Voltar às Integrações</Link></Button>
    </section>
  </main>;
};
export default InstagramOAuthCallbackPage;
