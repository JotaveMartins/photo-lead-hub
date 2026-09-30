import { describe, it, expect } from "vitest";
import { getLocalDateStr, parseLocalDate, normalizeText } from "@/lib/utils";

describe("getLocalDateStr", () => {
  it("formata a data local com zero à esquerda", () => {
    expect(getLocalDateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
  it("usa o dia local mesmo às 23:59 (não vira o dia seguinte)", () => {
    expect(getLocalDateStr(new Date(2026, 8, 30, 23, 59, 59))).toBe("2026-09-30");
  });
  it("cobrança vencendo hoje não é vencida (comparação por string)", () => {
    const today = getLocalDateStr(new Date(2026, 8, 30, 23, 30));
    expect("2026-09-30" < today).toBe(false);
    expect("2026-09-29" < today).toBe(true);
  });
});

describe("parseLocalDate", () => {
  it("interpreta YYYY-MM-DD como meia-noite local, sem deslocar o dia", () => {
    const d = parseLocalDate("2026-03-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 1, 0]);
  });
  it("ignora horário em timestamps", () => {
    expect(getLocalDateStr(parseLocalDate("2026-12-31T23:00:00Z"))).toBe("2026-12-31");
  });
  it("ida e volta com getLocalDateStr", () => {
    expect(getLocalDateStr(parseLocalDate("2024-02-29"))).toBe("2024-02-29");
  });
});

describe("normalizeText", () => {
  it("remove acentos e caixa", () => {
    expect(normalizeText("João CORAÇÃO")).toBe("joao coracao");
  });
  it("trata nulos", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});
