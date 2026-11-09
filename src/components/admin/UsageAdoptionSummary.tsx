import { useMemo, useState } from "react";
import { ClipboardCopy, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildAdoptionFocus } from "@/lib/usageAdoption";
import type { ScoredAccount } from "@/lib/usageScore";
import { maskName } from "@/hooks/usePrivacyMode";

interface Props {
  accounts: ScoredAccount[];
  previousByUser: Map<string, ScoredAccount>;
  monthLabel: string;
  privacy: boolean;
  currentMonth: boolean;
  onSelect: (account: ScoredAccount) => void;
  populationLabel?: string;
}

const UsageAdoptionSummary = ({ accounts, previousByUser, monthLabel, privacy, currentMonth, onSelect, populationLabel }: Props) => {
  const [showAll, setShowAll] = useState(false);
  const focus = useMemo(() => buildAdoptionFocus(accounts, previousByUser), [accounts, previousByUser]);
  const indices = new Map(accounts.map((account, index) => [account.row.user_id, index]));
  const name = (account: ScoredAccount) => privacy ? maskName(indices.get(account.row.user_id) ?? 0) : account.row.nome || account.row.email || "Conta sem nome";
  const firstNames = focus.attention.slice(0, 3).map((item) => name(item.account)).join(", ");
  const intro = focus.total === 0
    ? "Nenhuma conta disponível no período para indicar prioridades."
    : focus.attention.length === 0
      ? `Todas as ${focus.total} contas analisadas estão engajadas. Mantenha o acompanhamento para sustentar o uso.`
      : `${focus.engaged} de ${focus.total} contas estão engajadas (${focus.rate}%). ${focus.attention.length} ${focus.attention.length === 1 ? "conta ainda não atingiu" : "contas ainda não atingiram"} o critério de adoção. Comece por ${firstNames}.`;
  const criteria = "Critério atual: acesso ao CRM, movimentação do pipeline e score de pelo menos 10. A atividade do WhatsApp, sozinha, não comprova uso do CRM.";
  const copy = async () => {
    const text = [
      `Foco da equipe${populationLabel ? ` | ${populationLabel}` : ""} | ${monthLabel}${currentMonth ? " (mês em andamento)" : ""}`,
      intro,
      ...focus.attention.map((item, index) => `${index + 1}. ${name(item.account)}\nFoco: ${item.focus}\nMotivo: ${item.reason}\nAção sugerida: ${item.action}`),
      criteria,
      "Sugestões baseadas nas métricas registradas. Confirme com o cliente o motivo da baixa adoção.",
    ].join("\n\n");
    try { await navigator.clipboard.writeText(text); toast.success("Resumo copiado para compartilhar com a equipe"); }
    catch { toast.error("Não foi possível copiar o resumo. Tente novamente."); }
  };

  return <section aria-label="Foco da equipe para aumentar a adoção" className="mb-6 rounded-xl border border-primary/20 bg-card p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Target className="h-5 w-5 text-primary" />Foco da equipe</h2><p className="text-xs text-muted-foreground capitalize">{monthLabel}{currentMonth && " | mês em andamento"}{populationLabel && ` | ${populationLabel}`}</p></div>
      <Button variant="outline" size="sm" onClick={copy} disabled={!focus.total}><ClipboardCopy className="mr-1 h-4 w-4" />Copiar resumo</Button>
    </div>
    <p className="text-sm leading-relaxed text-foreground">{intro}</p>
    {!!focus.attention.length && <>
      <p className="text-xs text-muted-foreground">Prioridade sugerida: quem deixou de estar engajado, depois contas sem acesso, uso sem pipeline e demais contas com uso parcial.</p>
      <div className="divide-y divide-border rounded-lg border border-border">
        {(showAll ? focus.attention : focus.attention.slice(0, 5)).map((item, index) => <article key={item.account.row.user_id} className="p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{index + 1}. {name(item.account)}</h3>
            <Button variant="ghost" size="sm" onClick={() => onSelect(item.account)}>Ver detalhes</Button>
          </div>
          <p className="text-xs font-medium text-primary">{item.focus}</p>
          <p className="text-sm text-muted-foreground">{item.reason}</p>
          <p className="text-sm"><strong>Ação sugerida:</strong> {item.action}</p>
        </article>)}
      </div>
      {focus.attention.length > 5 && <Button variant="outline" size="sm" onClick={() => setShowAll((value) => !value)}>{showAll ? "Mostrar só as 5 primeiras" : `Ver todas as ${focus.attention.length} contas que precisam de atenção`}</Button>}
    </>}
    <p className="text-xs leading-relaxed text-muted-foreground">{criteria} O score é relativo às contas do período. As sugestões apontam onde conversar com o cliente, sem presumir o motivo da baixa adoção.</p>
  </section>;
};
export default UsageAdoptionSummary;
