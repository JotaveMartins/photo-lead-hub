import { describe, it, expect } from "vitest";
import {
  sortPipelineStages,
  getOpenStages,
  getFirstStageAfterLead,
  isTerminalStage,
  pipelineStageColorClass,
  type PipelineStage,
} from "@/lib/pipelineStages";

const mkStage = (over: Partial<PipelineStage>): PipelineStage => ({
  id: over.id || crypto.randomUUID(),
  user_id: "u1",
  name: over.name || "Etapa",
  color_key: over.color_key || "stage-1",
  position: over.position ?? 0,
  stage_role: over.stage_role || "open",
  legacy_status: over.legacy_status ?? null,
  created_at: "",
  updated_at: "",
  ...over,
});

const defaultStages: PipelineStage[] = [
  mkStage({ id: "won", name: "Fechado Ganho", position: 7, stage_role: "won", legacy_status: "Fechado Ganho", color_key: "status-success" }),
  mkStage({ id: "lead", name: "Novo Lead", position: 1, stage_role: "lead", legacy_status: "Novo Lead" }),
  mkStage({ id: "lost", name: "Fechado Perdido", position: 8, stage_role: "lost", legacy_status: "Fechado Perdido", color_key: "status-danger" }),
  mkStage({ id: "contato", name: "Contato Iniciado", position: 2, stage_role: "open", legacy_status: "Contato Iniciado" }),
  mkStage({ id: "proposta", name: "Proposta Enviada", position: 4, stage_role: "proposal", legacy_status: "Proposta Enviada" }),
  mkStage({ id: "follow", name: "Follow-up", position: 5, stage_role: "open", legacy_status: "Follow-up" }),
];

describe("pipelineStages helpers", () => {
  it("ordena por position", () => {
    const sorted = sortPipelineStages(defaultStages);
    expect(sorted.map((s) => s.id)).toEqual(["lead", "contato", "proposta", "follow", "won", "lost"]);
  });

  it("getOpenStages exclui etapas terminais", () => {
    const open = getOpenStages(defaultStages);
    expect(open.map((s) => s.id)).toEqual(["lead", "contato", "proposta", "follow"]);
  });

  it("getFirstStageAfterLead retorna a primeira etapa após a âncora lead", () => {
    expect(getFirstStageAfterLead(defaultStages)?.id).toBe("contato");
  });

  it("getFirstStageAfterLead retorna null sem etapa lead", () => {
    const semLead = defaultStages.filter((s) => s.stage_role !== "lead");
    expect(getFirstStageAfterLead(semLead)).toBeNull();
  });

  it("isTerminalStage identifica won e lost", () => {
    expect(isTerminalStage(defaultStages.find((s) => s.id === "won"))).toBe(true);
    expect(isTerminalStage(defaultStages.find((s) => s.id === "lost"))).toBe(true);
    expect(isTerminalStage(defaultStages.find((s) => s.id === "contato"))).toBe(false);
    expect(isTerminalStage(null)).toBe(false);
  });

  it("pipelineStageColorClass usa tokens conhecidos e fallback", () => {
    expect(pipelineStageColorClass("stage-3")).toBe("bg-[hsl(var(--stage-3))]");
    expect(pipelineStageColorClass("status-success")).toBe("bg-[hsl(var(--status-success))]");
    expect(pipelineStageColorClass("cor-invalida")).toBe("bg-[hsl(var(--stage-1))]");
    expect(pipelineStageColorClass(null)).toBe("bg-[hsl(var(--stage-1))]");
  });
});
