import { describe, it, expect } from "vitest";
import {
  buildStageMaps,
  buildHistoryByLead,
  getFirstStageEntry,
  getFirstRoleEntry,
  buildLeadPipelineFacts,
  buildStageFunnelCounts,
  type PipelineStageRow,
  type StageHistoryEventRow,
} from "@/lib/leadPipelineReporting";

const USER = "u1";
const stages: PipelineStageRow[] = [
  { id: "s-lead", user_id: USER, name: "Novo Lead", color_key: "c1", position: 1, stage_role: "lead", legacy_status: "Novo Lead" },
  { id: "s-contato", user_id: USER, name: "Contato Iniciado", color_key: "c2", position: 2, stage_role: "open", legacy_status: "Contato Iniciado" },
  { id: "s-proposta", user_id: USER, name: "Proposta Enviada", color_key: "c3", position: 3, stage_role: "proposal", legacy_status: "Proposta Enviada" },
  { id: "s-contrato", user_id: USER, name: "Contrato Enviado", color_key: "c4", position: 4, stage_role: "open", legacy_status: "Contrato Enviado" },
  { id: "s-won", user_id: USER, name: "Fechado Ganho", color_key: "c5", position: 5, stage_role: "won", legacy_status: "Fechado Ganho" },
  { id: "s-lost", user_id: USER, name: "Fechado Perdido", color_key: "c6", position: 6, stage_role: "lost", legacy_status: "Fechado Perdido" },
];

const ev = (lead_id: string, to_stage_id: string, to_stage_role: StageHistoryEventRow["to_stage_role"], entered_at: string): StageHistoryEventRow =>
  ({ lead_id, to_stage_id, to_stage_role, entered_at });

describe("leadPipelineReporting", () => {
  it("buildStageMaps indexa por id e por legacy_status da conta", () => {
    const { stagesById, legacyStageByUser } = buildStageMaps(stages);
    expect(stagesById.get("s-won")?.stage_role).toBe("won");
    expect(legacyStageByUser.get(USER)?.get("Contato Iniciado")).toBe("s-contato");
  });

  it("getFirstStageEntry retorna a primeira entrada e ignora reentradas", () => {
    const events = buildHistoryByLead([
      ev("l1", "s-proposta", "proposal", "2026-09-10T10:00:00Z"),
      ev("l1", "s-contato", "open", "2026-09-12T10:00:00Z"),
      ev("l1", "s-proposta", "proposal", "2026-09-15T10:00:00Z"),
    ]).get("l1");
    expect(getFirstStageEntry(events, "s-proposta")).toBe("2026-09-10T10:00:00Z");
  });

  it("getFirstRoleEntry usa o papel, não o nome da etapa", () => {
    const renamed = stages.map((s) => (s.id === "s-won" ? { ...s, name: "Venda Concluída" } : s));
    const { stagesById } = buildStageMaps(renamed);
    expect(stagesById.get("s-won")?.stage_role).toBe("won");
    const events = buildHistoryByLead([ev("l1", "s-won", "won", "2026-09-20T10:00:00Z")]).get("l1");
    expect(getFirstRoleEntry(events, "won")).toBe("2026-09-20T10:00:00Z");
  });

  it("lead ganho que saiu de won mantém o evento histórico de venda", () => {
    const leads = [{ id: "l1", user_id: USER }];
    const history = [
      ev("l1", "s-lead", "lead", "2026-09-01T10:00:00Z"),
      ev("l1", "s-won", "won", "2026-09-20T10:00:00Z"),
      ev("l1", "s-contato", "open", "2026-09-25T10:00:00Z"),
    ];
    const facts = buildLeadPipelineFacts(leads, stages, history);
    expect(facts.get("l1")?.wonTs).toBe("2026-09-20T10:00:00Z");
  });

  it("lead que entrou duas vezes em won conta uma única vez (primeira entrada)", () => {
    const leads = [{ id: "l1", user_id: USER }];
    const history = [
      ev("l1", "s-won", "won", "2026-09-20T10:00:00Z"),
      ev("l1", "s-contato", "open", "2026-09-22T10:00:00Z"),
      ev("l1", "s-won", "won", "2026-09-28T10:00:00Z"),
    ];
    const facts = buildLeadPipelineFacts(leads, stages, history);
    expect(facts.get("l1")?.wonTs).toBe("2026-09-20T10:00:00Z");
  });

  it("lead perdido: primeira entrada em lost", () => {
    const leads = [{ id: "l1", user_id: USER }];
    const history = [
      ev("l1", "s-lost", "lost", "2026-08-05T10:00:00Z"),
      ev("l1", "s-contato", "open", "2026-08-10T10:00:00Z"),
      ev("l1", "s-lost", "lost", "2026-08-15T10:00:00Z"),
    ];
    const facts = buildLeadPipelineFacts(leads, stages, history);
    expect(facts.get("l1")?.lostTs).toBe("2026-08-05T10:00:00Z");
  });

  it("lead sem proposta não tem propostaTs", () => {
    const leads = [{ id: "l1", user_id: USER }];
    const history = [ev("l1", "s-lead", "lead", "2026-09-01T10:00:00Z")];
    const facts = buildLeadPipelineFacts(leads, stages, history);
    expect(facts.get("l1")?.propostaTs).toBeNull();
    expect(facts.get("l1")?.wonTs).toBeNull();
  });

  it("contato e contrato usam a etapa legacy da conta do lead", () => {
    const leads = [{ id: "l1", user_id: USER }];
    const history = [
      ev("l1", "s-contato", "open", "2026-09-02T10:00:00Z"),
      ev("l1", "s-contrato", "open", "2026-09-18T10:00:00Z"),
    ];
    const facts = buildLeadPipelineFacts(leads, stages, history);
    expect(facts.get("l1")?.contatoTs).toBe("2026-09-02T10:00:00Z");
    expect(facts.get("l1")?.contratoTs).toBe("2026-09-18T10:00:00Z");
  });

  it("não usa etapa de outra conta para classificar o lead", () => {
    const otherStages: PipelineStageRow[] = [
      { id: "x-contato", user_id: "u2", name: "Contato Iniciado", color_key: "c2", position: 2, stage_role: "open", legacy_status: "Contato Iniciado" },
    ];
    const leads = [{ id: "l1", user_id: USER }];
    const history = [ev("l1", "x-contato", "open", "2026-09-02T10:00:00Z")];
    const facts = buildLeadPipelineFacts(leads, [...stages, ...otherStages], history);
    // a etapa x-contato não pertence à conta u1 -> contatoTs deve ser null
    expect(facts.get("l1")?.contatoTs).toBeNull();
  });

  it("buildStageFunnelCounts conta primeira entrada por etapa ordenada por position", () => {
    const leads = [
      { id: "l1", user_id: USER },
      { id: "l2", user_id: USER },
    ];
    const history = [
      ev("l1", "s-lead", "lead", "2026-09-01T10:00:00Z"),
      ev("l1", "s-contato", "open", "2026-09-02T10:00:00Z"),
      ev("l2", "s-lead", "lead", "2026-09-01T11:00:00Z"),
      ev("l2", "s-contato", "open", "2026-09-03T10:00:00Z"),
      ev("l2", "s-lead", "lead", "2026-09-04T10:00:00Z"), // reentrada
    ];
    const counts = buildStageFunnelCounts(leads, stages, history, USER);
    expect(counts.map((c) => c.stage.id)).toEqual(["s-lead", "s-contato", "s-proposta", "s-contrato", "s-won", "s-lost"]);
    expect(counts[0].count).toBe(2); // s-lead: reentrada não duplica
    expect(counts[1].count).toBe(2);
    expect(counts[2].count).toBe(0);
  });
});
