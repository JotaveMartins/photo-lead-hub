import { describe, it, expect } from "vitest";
import {
  deliveryStageColorClass,
  firstOpenStage,
  deliveredStage,
  isDeliveredStage,
  sortStages,
  type DeliveryStage,
} from "@/lib/deliveryStages";

const stage = (over: Partial<DeliveryStage>): DeliveryStage =>
  ({
    id: crypto.randomUUID(),
    user_id: "u1",
    name: "Etapa",
    color_key: "delivery-1",
    position: 0,
    stage_role: "open",
    created_at: "",
    updated_at: "",
    ...over,
  }) as DeliveryStage;

describe("deliveryStages helpers", () => {
  it("ordena por position ASC", () => {
    const list = [stage({ position: 2 }), stage({ position: 0 }), stage({ position: 1 })];
    expect(sortStages(list).map((s) => s.position)).toEqual([0, 1, 2]);
  });

  it("primeira etapa open é a inicial", () => {
    const list = [
      stage({ position: 3, stage_role: "delivered" }),
      stage({ position: 1, name: "Em edição" }),
      stage({ position: 0, name: "Agendado" }),
    ];
    expect(firstOpenStage(list)?.name).toBe("Agendado");
  });

  it("detecta a etapa delivered independente do nome", () => {
    const list = [stage({ position: 0 }), stage({ position: 1, name: "Finalizado", stage_role: "delivered" })];
    expect(deliveredStage(list)?.name).toBe("Finalizado");
    expect(isDeliveredStage(list[1])).toBe(true);
    expect(isDeliveredStage(list[0])).toBe(false);
  });

  it("mapeia color_key para classe do token", () => {
    expect(deliveryStageColorClass("delivery-3")).toBe("bg-[hsl(var(--delivery-3))]");
  });

  it("color_key inválida cai no fallback delivery-1", () => {
    expect(deliveryStageColorClass("qualquer-coisa")).toBe("bg-[hsl(var(--delivery-1))]");
  });
});
