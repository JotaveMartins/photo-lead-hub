import { Link, Navigate } from "react-router-dom";
import { MessageCircle, Clock3, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { CRM_PLANS, supportUrl, accessStatusLabel } from "@/lib/accountAccess";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import logo from "@/assets/logo.png";

const AssinaturaPage = () => {
  const { user, loading, signOut } = useAuth();
  const access = useAccountAccess();
  if (loading || (user && access.isLoading)) return <p className="py-20 text-center text-muted-foreground">Carregando...</p>;
  if (!user) return <Navigate to="/auth" replace />;
  const data = access.data;
  return <div className="min-h-screen bg-background px-4 py-10 sm:py-16">
    <main className="mx-auto max-w-3xl space-y-8">
      <header className="text-center space-y-3">
        <img src={logo} alt="CRM" className="mx-auto h-14 w-14 object-contain" />
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {data?.status === "expired" && data.mode === "trial" ? "Seu teste grátis chegou ao fim" : data?.status === "expired" ? "Seu período de acesso chegou ao fim" : "Continue com o seu CRM"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {data?.status === "expired" ? "O fim do período de acesso não apaga seus dados. Fale com a nossa equipe para contratar um plano e continuar usando o sistema." : "Escolha o período de acesso e converse com a nossa equipe para contratar. Sem cobrança automática."}
        </p>
      </header>
      {access.isError && <ErrorState compact title="Não foi possível consultar seu acesso" onRetry={() => access.refetch()} />}
      {data && <section className="rounded-xl border border-border bg-card p-4 text-sm space-y-1">
        <p className="flex items-center gap-2 font-medium">{data.allowed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Clock3 className="h-4 w-4 text-amber-500" />}{accessStatusLabel(data)}</p>
        {data.status === "trial" && <p className="text-muted-foreground">Você ainda tem {data.days_remaining} {data.days_remaining === 1 ? "dia" : "dias"} de teste grátis.</p>}
        {data.expires_at && <p className="text-muted-foreground">Término do período: {new Date(data.expires_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (São Paulo).</p>}
        {data.status === "pending_confirmation" && <p className="text-muted-foreground">Confirme seu e-mail para iniciar os 60 dias grátis.</p>}
        {data.status === "blocked" && <p className="text-muted-foreground">Fale com a equipe para regularizar o acesso da sua conta.</p>}
      </section>}
      <section className="grid gap-4 sm:grid-cols-2" aria-label="Planos de acesso">
        {CRM_PLANS.map((plan) => <article key={plan.id} className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">Plano {plan.label}</h2>
          <p className="text-3xl font-bold text-primary">{plan.price}</p>
          <p className="text-sm text-muted-foreground">Valor total por {plan.period} de acesso.</p>
          <Button asChild className="w-full"><a href={supportUrl(plan.label)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar com a equipe</a></Button>
        </article>)}
      </section>
      <footer className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">Atendimento pelo WhatsApp: <a className="text-primary underline" href={supportUrl()} target="_blank" rel="noopener noreferrer">(61) 3306-1009</a></p>
        <p className="text-xs text-muted-foreground">A contratação e a liberação do plano são feitas pela equipe. Nenhum valor é cobrado pelo CRM automaticamente.</p>
        <div className="flex justify-center gap-2">
          {data?.allowed && <Button variant="outline" asChild><Link to="/inicio">Voltar ao CRM</Link></Button>}
          <Button variant="ghost" onClick={() => signOut()}>Sair</Button>
        </div>
      </footer>
    </main>
  </div>;
};
export default AssinaturaPage;
