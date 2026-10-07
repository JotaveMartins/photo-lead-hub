// Camada central de cálculo dos relatórios do Funil de Leads (Sprint 02).
// Fonte semântica: pipeline_stages (stage_role / legacy_status) + lead_stage_history.
// Regras universais NUNCA dependem do nome visível da etapa.

export type StageRole = "lead" | "open" | "proposal" | "won" | "lost";

export interface PipelineStageRow {
  id: string;
  user_id: string;
  name: string;
  color_key: string;
  position: number;
  stage_role: StageRole;
  legacy_status: string | null;
}

export interface StageHistoryEventRow {
  lead_id: string;
  to_stage_id: string | null;
  to_stage_role: StageRole;
  entered_at: string;
}

export interface LeadPipelineFacts {
  /** primeira entrada na etapa legacy 'Contato Iniciado' da conta do lead */
  contatoTs: string | null;
  /** primeira entrada em stage_role = 'proposal' */
  propostaTs: string | null;
  /** primeira entrada na etapa legacy 'Contrato Enviado' da conta do lead */
  contratoTs: string | null;
  /** primeira entrada em stage_role = 'won' (evento de venda) */
  wonTs: string | null;
  /** primeira entrada em stage_role = 'lost' */
  lostTs: string | null;
}

export interface StageMaps {
  stagesById: Map<string, PipelineStageRow>;
  /** user_id -> (legacy_status -> stage_id) */
  legacyStageByUser: Map<string, Map<string, string>>;
}

export const buildStageMaps = (stages: PipelineStageRow[]): StageMaps => {
  const stagesById = new Map<string, PipelineStageRow>();
  const legacyStageByUser = new Map<string, Map<string, string>>();
  for (const s of stages) {
    stagesById.set(s.id, s);
    if (s.legacy_status) {
      let m = legacyStageByUser.get(s.user_id);
      if (!m) {
        m = new Map();
        legacyStageByUser.set(s.user_id, m);
      }
      m.set(s.legacy_status, s.id);
    }
  }
  return { stagesById, legacyStageByUser };
};

/** lead_id -> eventos ordenados por entered_at ASC */
export const buildHistoryByLead = (
  events: StageHistoryEventRow[],
): Map<string, StageHistoryEventRow[]> => {
  const map = new Map<string, StageHistoryEventRow[]>();
  for (const e of events) {
    const arr = map.get(e.lead_id);
    if (arr) arr.push(e);
    else map.set(e.lead_id, [e]);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.entered_at.localeCompare(b.entered_at));
  }
  return map;
};

/** Primeira entrada do lead numa etapa específica (reentradas não contam). */
export const getFirstStageEntry = (
  events: StageHistoryEventRow[] | undefined,
  stageId: string,
): string | null => {
  if (!events) return null;
  for (const e of events) {
    if (e.to_stage_id === stageId) return e.entered_at;
  }
  return null;
};

/** Primeira entrada do lead num papel (proposal/won/lost...), qualquer etapa. */
export const getFirstRoleEntry = (
  events: StageHistoryEventRow[] | undefined,
  role: StageRole,
): string | null => {
  if (!events) return null;
  for (const e of events) {
    if (e.to_stage_role === role) return e.entered_at;
  }
  return null;
};

/**
 * Fatos derivados por lead: primeiras entradas nas etapas/papéis usados
 * pelos relatórios. Reentradas nunca duplicam métricas.
 */
export const buildLeadPipelineFacts = <T extends { id: string; user_id: string }>(
  leads: T[],
  stages: PipelineStageRow[],
  history: StageHistoryEventRow[],
): Map<string, LeadPipelineFacts> => {
  const { legacyStageByUser } = buildStageMaps(stages);
  const historyByLead = buildHistoryByLead(history);
  const facts = new Map<string, LeadPipelineFacts>();
  for (const lead of leads) {
    const events = historyByLead.get(lead.id);
    const legacy = legacyStageByUser.get(lead.user_id);
    const contatoStage = legacy?.get("Contato Iniciado");
    const contratoStage = legacy?.get("Contrato Enviado");
    facts.set(lead.id, {
      contatoTs: contatoStage ? getFirstStageEntry(events, contatoStage) : null,
      propostaTs: getFirstRoleEntry(events, "proposal"),
      contratoTs: contratoStage ? getFirstStageEntry(events, contratoStage) : null,
      wonTs: getFirstRoleEntry(events, "won"),
      lostTs: getFirstRoleEntry(events, "lost"),
    });
  }
  return facts;
};

/**
 * Helper para o futuro funil dinâmico (Sprint 03): para uma conta, quantos
 * leads tiveram primeira entrada em cada etapa, ordenado por position ASC.
 * Não usado na UI ainda.
 */
export const buildStageFunnelCounts = <T extends { id: string; user_id: string }>(
  leads: T[],
  stages: PipelineStageRow[],
  history: StageHistoryEventRow[],
  userId: string,
): { stage: PipelineStageRow; count: number }[] => {
  const accountStages = stages
    .filter((s) => s.user_id === userId)
    .sort((a, b) => a.position - b.position);
  const historyByLead = buildHistoryByLead(history);
  const accountLeads = leads.filter((l) => l.user_id === userId);
  return accountStages.map((stage) => {
    let count = 0;
    for (const lead of accountLeads) {
      if (getFirstStageEntry(historyByLead.get(lead.id), stage.id)) count++;
    }
    return { stage, count };
  });
};
