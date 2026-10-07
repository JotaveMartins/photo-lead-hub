import type { Database } from "@/integrations/supabase/types";

export type DeliveryStage = Database["public"]["Tables"]["delivery_stages"]["Row"];
export type DeliveryStageRole = DeliveryStage["stage_role"];

/** Chaves de cor permitidas (validadas no banco via CHECK). */
export const DELIVERY_STAGE_COLOR_KEYS = [
  "delivery-1",
  "delivery-2",
  "delivery-3",
  "delivery-4",
  "delivery-5",
] as const;

export type DeliveryStageColorKey = (typeof DELIVERY_STAGE_COLOR_KEYS)[number];

/** Mapeia color_key -> classe visual (tokens HSL do tema). */
export const deliveryStageColorClass = (colorKey: string): string =>
  DELIVERY_STAGE_COLOR_KEYS.includes(colorKey as DeliveryStageColorKey)
    ? `bg-[hsl(var(--${colorKey}))]`
    : "bg-[hsl(var(--delivery-1))]";

export const isDeliveredStage = (stage: Pick<DeliveryStage, "stage_role">): boolean =>
  stage.stage_role === "delivered";

/** Ordena por position ASC. */
export const sortStages = <T extends Pick<DeliveryStage, "position">>(stages: T[]): T[] =>
  [...stages].sort((a, b) => a.position - b.position);

/** Primeira etapa open (etapa inicial de novas entregas). */
export const firstOpenStage = (stages: DeliveryStage[]): DeliveryStage | undefined =>
  sortStages(stages).find((s) => s.stage_role === "open");

/** Etapa de conclusão (delivered) da conta. */
export const deliveredStage = (stages: DeliveryStage[]): DeliveryStage | undefined =>
  stages.find((s) => s.stage_role === "delivered");
