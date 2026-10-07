import type { Database } from "@/integrations/supabase/types";

export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];
export type PipelineStageRole = PipelineStage["stage_role"];

/** Chaves de cor permitidas (validadas no banco via RPC). */
export const PIPELINE_STAGE_COLOR_KEYS = [
  "stage-1",
  "stage-2",
  "stage-3",
  "stage-4",
  "stage-5",
  "stage-6",
] as const;

export type PipelineStageColorKey = (typeof PIPELINE_STAGE_COLOR_KEYS)[number];

/** Mapeia color_key -> classe visual (tokens HSL do tema). */
export const pipelineStageColorClass = (colorKey: string): string => {
  if (
    (PIPELINE_STAGE_COLOR_KEYS as readonly string[]).includes(colorKey) ||
    colorKey === "status-success" ||
    colorKey === "status-danger"
  ) {
    return `bg-[hsl(var(--${colorKey}))]`;
  }
  return "bg-[hsl(var(--stage-1))]";
};

/** Ordena por position ASC. */
export const sortPipelineStages = <T extends Pick<PipelineStage, "position">>(stages: T[]): T[] =>
  [...stages].sort((a, b) => a.position - b.position);

export const leadStage = (stages: PipelineStage[]): PipelineStage | undefined =>
  stages.find((s) => s.stage_role === "lead");

export const wonStage = (stages: PipelineStage[]): PipelineStage | undefined =>
  stages.find((s) => s.stage_role === "won");

export const lostStage = (stages: PipelineStage[]): PipelineStage | undefined =>
  stages.find((s) => s.stage_role === "lost");

export const proposalStage = (stages: PipelineStage[]): PipelineStage | undefined =>
  stages.find((s) => s.stage_role === "proposal");

/** Etapas visíveis no filtro "Em aberto" do Kanban: lead + open + proposal, por position. */
export const openPipelineStages = (stages: PipelineStage[]): PipelineStage[] =>
  sortPipelineStages(stages.filter((s) => ["lead", "open", "proposal"].includes(s.stage_role)));

/** Primeira etapa ativa depois da etapa inicial (lead), por position. */
export const firstStageAfterLead = (stages: PipelineStage[]): PipelineStage | undefined => {
  const lead = leadStage(stages);
  if (!lead) return undefined;
  return sortPipelineStages(
    stages.filter((s) => s.position > lead.position && !["won", "lost"].includes(s.stage_role)),
  )[0];
};

/** Etapa é terminal (ganho/perda)? */
export const isTerminalStage = (stage: Pick<PipelineStage, "stage_role">): boolean =>
  stage.stage_role === "won" || stage.stage_role === "lost";

/** Resolve a etapa de um lead pelo stage_id. */
export const stageById = (
  stages: PipelineStage[],
  stageId: string | null | undefined,
): PipelineStage | undefined => (stageId ? stages.find((s) => s.id === stageId) : undefined);
