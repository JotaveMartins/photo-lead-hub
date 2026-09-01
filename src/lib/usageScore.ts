export interface UsageRow {
  user_id: string;
  nome: string | null;
  email: string | null;
  leads: number;
  pipeline: number;
  tarefas: number;
  inbox: number;
  financeiro: number;
  agenda: number;
  clientes: number;
  entregas: number;
  contratos: number;
  estudio: number;
  ultimo_acesso: string | null;
  acessou_no_mes: boolean;
}

export type PillarKey =
  | "leads"
  | "pipeline"
  | "tarefas"
  | "inbox"
  | "financeiro"
  | "agenda"
  | "clientes"
  | "entregas"
  | "contratos"
  | "estudio";

export const PILLARS: { key: PillarKey; label: string; weight: number; hint: string }[] = [
  { key: "leads", label: "Leads", weight: 3, hint: "Leads criados no mês" },
  { key: "pipeline", label: "Pipeline", weight: 3, hint: "Alterações manuais nos leads (etapas e campos)" },
  { key: "tarefas", label: "Tarefas", weight: 3, hint: "Tarefas concluídas no mês" },
  { key: "inbox", label: "Inbox", weight: 3, hint: "Mensagens enviadas pelo WhatsApp" },
  { key: "financeiro", label: "Financeiro", weight: 2, hint: "Cobranças e despesas lançadas" },
  { key: "agenda", label: "Agenda", weight: 2, hint: "Eventos criados" },
  { key: "clientes", label: "Clientes", weight: 1, hint: "Clientes cadastrados" },
  { key: "entregas", label: "Entregas", weight: 1, hint: "Entregas criadas ou movidas de etapa" },
  { key: "contratos", label: "Contratos", weight: 1, hint: "Contratos criados" },
  { key: "estudio", label: "Estúdio IA", weight: 1, hint: "Projetos e carrosséis criados" },
];

export interface ScoredAccount {
  row: UsageRow;
  score: number;
  pillarScores: Record<PillarKey, number>;
  total: number;
  top: PillarKey[];
  bottom: PillarKey[];
}

/**
 * Nota 0-100 por pilar comparando a conta com as demais do mesmo mês
 * (posição relativa / percentil). Contas com uso zero no pilar recebem 0.
 */
const percentileScores = (values: number[]): number[] => {
  const positives = values.filter((v) => v > 0).sort((a, b) => a - b);
  return values.map((v) => {
    if (v <= 0) return 0;
    if (positives.length <= 1) return 100;
    const below = positives.filter((p) => p < v).length;
    const equal = positives.filter((p) => p === v).length;
    const pct = (below + equal / 2) / positives.length;
    return Math.round(Math.max(5, Math.min(100, pct * 100)));
  });
};

export const scoreAccounts = (rows: UsageRow[]): ScoredAccount[] => {
  const perPillar: Record<string, number[]> = {};
  PILLARS.forEach((p) => {
    perPillar[p.key] = percentileScores(rows.map((r) => Number(r[p.key] ?? 0)));
  });

  const totalWeight = PILLARS.reduce((s, p) => s + p.weight, 0);

  return rows.map((row, i) => {
    const pillarScores = {} as Record<PillarKey, number>;
    let weighted = 0;
    PILLARS.forEach((p) => {
      const s = perPillar[p.key][i];
      pillarScores[p.key] = s;
      weighted += s * p.weight;
    });
    let score = Math.round(weighted / totalWeight);
    // Sem nenhum acesso no mês o score não pode passar de 10
    if (!row.acessou_no_mes && score > 10) score = Math.min(score, 10);

    const totals = PILLARS.map((p) => ({ key: p.key, n: Number(row[p.key] ?? 0) }));
    const total = totals.reduce((s, t) => s + t.n, 0);
    const sorted = [...totals].sort((a, b) => b.n - a.n);
    const top = sorted.filter((t) => t.n > 0).slice(0, 3).map((t) => t.key);
    const bottom = [...totals]
      .sort((a, b) => a.n - b.n)
      .filter((t) => t.n === 0)
      .slice(0, 4)
      .map((t) => t.key);

    return { row, score, pillarScores, total, top, bottom };
  });
};

export const pillarLabel = (key: PillarKey) => PILLARS.find((p) => p.key === key)?.label ?? key;

export const monthStartISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

export const previousMonthDate = (d: Date) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
