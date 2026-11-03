import { useState } from "react";
import { toast } from "sonner";
import { useAdminAccountAccess, useManageAccountAccess } from "@/hooks/useAccountAccess";
import { CRM_PLANS, accessStatusLabel, type AccountAccess } from "@/lib/accountAccess";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/error-state";
import { usePrivacyMode, maskName, maskEmail } from "@/hooks/usePrivacyMode";

const AccountAccessTab = () => {
  const accounts = useAdminAccountAccess();
  const manage = useManageAccountAccess();
  const { enabled: privacy } = usePrivacyMode();
  const [filter, setFilter] = useState("all");
  const [target, setTarget] = useState<{ nome: string; access: AccountAccess } | null>(null);
  const [action, setAction] = useState<"extend_trial" | "grant_semestral" | "grant_anual">("grant_semestral");
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const items = accounts.data ?? [];
  const filtered = items.filter((row) => filter === "all" || row.access.status === filter);
  const save = () => {
    if (!target) return;
    manage.mutate({ userId: target.access.user_id, action, days: action === "extend_trial" ? days : undefined, note: note.trim() }, {
      onSuccess: () => { toast.success("Período de acesso atualizado"); setTarget(null); },
      onError: (error) => toast.error(error.message || "Não foi possível atualizar o acesso"),
    });
  };
  return <div className="space-y-5">
    <header><h1 className="font-display text-2xl font-bold">Acessos e testes</h1><p className="text-sm text-muted-foreground">Gerencie o teste de 60 dias e libere os planos após combinar a contratação com o cliente.</p></header>
    <div className="grid gap-3 sm:grid-cols-3">
      {[["Em teste", items.filter((row) => row.access.status === "trial").length], ["Vencidos", items.filter((row) => row.access.status === "expired").length], ["Planos ativos", items.filter((row) => row.access.status === "manual").length]].map(([title, count]) => <div key={title} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{title}</p><p className="text-2xl font-semibold">{count}</p></div>)}
    </div>
    <div className="max-w-xs"><Label htmlFor="access-status-filter">Situação</Label><Select value={filter} onValueChange={setFilter}><SelectTrigger id="access-status-filter"><SelectValue /></SelectTrigger><SelectContent>
      <SelectItem value="all">Todas</SelectItem><SelectItem value="trial">Em teste</SelectItem><SelectItem value="expired">Vencidos</SelectItem><SelectItem value="manual">Planos ativos</SelectItem><SelectItem value="legacy">Acesso anterior</SelectItem><SelectItem value="blocked">Bloqueados</SelectItem><SelectItem value="pending_confirmation">Aguardando e-mail</SelectItem>
    </SelectContent></Select></div>
    {accounts.isError ? <ErrorState compact title="Não foi possível carregar os acessos" onRetry={() => accounts.refetch()} /> : <div className="rounded-xl border border-border overflow-x-auto"><Table>
      <TableHeader><TableRow><TableHead>Conta</TableHead><TableHead>Situação</TableHead><TableHead>Prazo</TableHead><TableHead /></TableRow></TableHeader>
      <TableBody>{accounts.isLoading ? <TableRow><TableCell colSpan={4}>Carregando...</TableCell></TableRow> : filtered.length === 0 ? <TableRow><TableCell colSpan={4}>Nenhuma conta nesta situação.</TableCell></TableRow> : filtered.map((row, index) => <TableRow key={row.access.user_id}>
        <TableCell><p className="font-medium">{privacy ? maskName(index) : row.nome || "Conta sem nome"}</p><p className="text-xs text-muted-foreground">{privacy ? maskEmail() : row.email}</p></TableCell>
        <TableCell><p>{accessStatusLabel(row.access)}</p>{row.access.plan && <p className="text-xs text-muted-foreground">Plano {row.access.plan}</p>}</TableCell>
        <TableCell>{row.access.expires_at ? <><p>{new Date(row.access.expires_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>{row.access.allowed && <p className="text-xs text-muted-foreground">{row.access.days_remaining} dias restantes</p>}</> : "Sem prazo definido"}</TableCell>
        <TableCell>{row.access.status !== "admin" && <Button variant="outline" size="sm" onClick={() => { setTarget({ nome: privacy ? maskName(index) : row.nome || "Conta", access: row.access }); setAction(row.access.mode === "trial" && row.access.trial_started_at ? "extend_trial" : "grant_semestral"); setDays(7); setNote(""); }}>Gerenciar</Button>}</TableCell>
      </TableRow>)}</TableBody>
    </Table></div>}
    <p className="text-xs text-muted-foreground">Contas anteriores à ativação do teste mantêm seu acesso. Uma liberação de plano não gera cobrança nem comprova pagamento. Bloqueios manuais continuam sendo gerenciados na aba Clientes.</p>
    <Dialog open={!!target} onOpenChange={(open) => { if (!open && !manage.isPending) setTarget(null); }}><DialogContent>
      <DialogHeader><DialogTitle>Gerenciar acesso de {target?.nome}</DialogTitle><DialogDescription>As alterações ficam registradas com o administrador responsável.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1"><Label htmlFor="access-action">Ação</Label><Select value={action} onValueChange={(value: typeof action) => setAction(value)} disabled={manage.isPending}><SelectTrigger id="access-action"><SelectValue /></SelectTrigger><SelectContent>
          {target?.access.mode === "trial" && target.access.trial_started_at && <SelectItem value="extend_trial">Estender teste grátis</SelectItem>}
          {CRM_PLANS.map((plan) => <SelectItem key={plan.id} value={plan.action}>Liberar {plan.period}: {plan.price}</SelectItem>)}
        </SelectContent></Select></div>
        {action === "extend_trial" ? <div><Label htmlFor="trial-extra-days">Dias adicionais</Label><Input id="trial-extra-days" type="number" min={1} max={60} value={days} disabled={manage.isPending} onChange={(event) => setDays(Number(event.target.value))} /><p className="mt-1 text-xs text-muted-foreground">Acrescenta os dias ao prazo atual, ou a partir de agora se o teste já venceu.</p></div> : <p className="text-sm text-muted-foreground">Use após combinar a contratação com o cliente. O prazo começa agora, ou após o fim do plano ativo em caso de renovação. Nenhum pagamento será processado.</p>}
        {target?.access.status === "blocked" && <p className="text-sm text-amber-500">A conta tem bloqueio manual. A liberação de prazo não remove esse bloqueio; revise-o na aba Clientes.</p>}
        <div><Label htmlFor="access-note">Observação</Label><Input id="access-note" value={note} maxLength={500} disabled={manage.isPending} placeholder="Motivo da extensão ou referência da contratação" onChange={(event) => setNote(event.target.value)} /></div>
        <Button onClick={save} disabled={manage.isPending || (action === "extend_trial" && (!Number.isInteger(days) || days < 1 || days > 60))} className="w-full">{manage.isPending ? "Salvando..." : "Confirmar alteração"}</Button>
      </div>
    </DialogContent></Dialog>
  </div>;
};
export default AccountAccessTab;
