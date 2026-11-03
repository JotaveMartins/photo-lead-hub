import type { ScoredAccount } from "./usageScore";

export type AdoptionStatus = "Engajado" | "Uso parcial" | "Inativo";

export const adoptionStatus = (account: ScoredAccount): AdoptionStatus => {
  if (!account.row.acessou_no_mes) return "Inativo";
  return Number(account.row.pipeline ?? 0) > 0 && account.score >= 10 ? "Engajado" : "Uso parcial";
};

export interface AdoptionFocusItem {
  account: ScoredAccount;
  priority: number;
  focus: string;
  reason: string;
  action: string;
}

export function buildAdoptionFocus(accounts: ScoredAccount[], previousByUser: Map<string, ScoredAccount>) {
  const attention: AdoptionFocusItem[] = [];
  for (const account of accounts) {
    const status = adoptionStatus(account);
    if (status === "Engajado") continue;
    const previous = previousByUser.get(account.row.user_id);
    const lostEngagement = !!previous && adoptionStatus(previous) === "Engajado";
    const days = Number(account.row.dias_ativos ?? 0);
    let focus: string, reason: string, action: string, priority: number;
    if (status === "Inativo") {
      focus = "Retomar o acesso";
      reason = "Sem acesso registrado ao CRM no mês.";
      if (Number(account.row.inbox ?? 0) > 0) reason += " Há mensagens no Inbox, que também podem vir do celular.";
      action = "Entrar em contato, confirmar se consegue acessar e combinar uma orientação prática para acompanhar um lead pelo CRM.";
      priority = 1;
    } else if (Number(account.row.pipeline ?? 0) === 0) {
      focus = "Orientar o uso do pipeline";
      reason = `${days > 0 ? `Acessou em ${days} ${days === 1 ? "dia" : "dias"}` : "Acessou o CRM"}, mas não movimentou etapas ou campos de leads no mês.`;
      action = "Revisar os leads junto com o cliente, atualizar etapas e combinar uma rotina de acompanhamento dentro do CRM.";
      priority = 2;
    } else {
      focus = "Fortalecer a rotina de uso";
      reason = `Acessou e movimentou o pipeline, mas o score ${account.score} ainda está abaixo do critério de adoção (10).`;
      action = "Entender quais partes da rotina ainda ficam fora do CRM e combinar um acompanhamento recorrente do pipeline e das tarefas de retorno.";
      priority = 3;
    }
    if (lostEngagement) {
      priority = 0;
      reason = `Estava engajado no mês anterior e passou para ${status.toLowerCase()}. ${reason}`;
      action = `Entender o que mudou desde o mês anterior. ${action}`;
    }
    attention.push({ account, priority, focus, reason, action });
  }
  attention.sort((a, b) => a.priority - b.priority
    || Number(a.account.row.acessou_no_mes) - Number(b.account.row.acessou_no_mes)
    || a.account.score - b.account.score
    || a.account.row.user_id.localeCompare(b.account.row.user_id));
  const engaged = accounts.length - attention.length;
  return {
    total: accounts.length,
    engaged,
    rate: accounts.length ? Math.round(engaged / accounts.length * 100) : 0,
    inactive: attention.filter((item) => !item.account.row.acessou_no_mes).length,
    noPipeline: attention.filter((item) => item.account.row.acessou_no_mes && Number(item.account.row.pipeline ?? 0) === 0).length,
    attention,
  };
}
