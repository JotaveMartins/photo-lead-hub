import { afterEach, describe, expect, it, vi } from "vitest";
import { getDateRange } from "@/components/reports/ReportFilters";
import { parseLocalDate } from "@/lib/utils";
afterEach(() => vi.useRealTimers());
describe("período comparável ao BI", () => {
  it("seleciona os sete dias completos até ontem", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 24, 12));
    const range = getDateRange("last7", "", "");
    expect(range.start).toEqual(new Date(2026, 10, 17));
    expect(range.end).toEqual(new Date(2026, 10, 24));
    expect(parseLocalDate("2026-11-17").getTime()).toBeGreaterThanOrEqual(range.start.getTime());
    expect(parseLocalDate("2026-11-23").getTime()).toBeLessThan(range.end.getTime());
    expect(parseLocalDate("2026-11-24").getTime()).toBe(range.end.getTime());
  });
  it("preserva os intervalos personalizados", () => {
    const range = getDateRange("custom", "2026-11-01", "2026-11-07");
    expect(range.start).toEqual(new Date(2026, 10, 1));
    expect(range.end).toEqual(new Date(2026, 10, 8));
  });
});
