import { describe, it, expect } from "vitest";
import { getSelectionStatus, canEditSelection, canFinalizeSelection } from "@/lib/gallerySelection";

describe("status derivado da seleção", () => {
  it("aguardando, em andamento e finalizada", () => {
    expect(getSelectionStatus(null, 0)).toBe("waiting");
    expect(getSelectionStatus(null, 3)).toBe("in_progress");
    expect(getSelectionStatus("2026-09-30T10:00:00Z", 3)).toBe("finalized");
  });
});

describe("finalização e bloqueio", () => {
  it("bloqueia edição após finalizar e no preview", () => {
    expect(canEditSelection({ finalizedAt: null })).toBe(true);
    expect(canEditSelection({ finalizedAt: "2026-09-30T10:00:00Z" })).toBe(false);
    expect(canEditSelection({ preview: true })).toBe(false);
  });
  it("finaliza só com 1..limite fotos", () => {
    expect(canFinalizeSelection({ count: 0, limit: 30 })).toBe(false);
    expect(canFinalizeSelection({ count: 12, limit: 30 })).toBe(true);
    expect(canFinalizeSelection({ count: 31, limit: 30 })).toBe(false);
    expect(canFinalizeSelection({ count: 5, limit: 30, finalizedAt: "x" })).toBe(false);
  });
});
