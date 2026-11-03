import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UsageAdoptionSummary from "@/components/admin/UsageAdoptionSummary";
import { adoptionStatus, buildAdoptionFocus } from "@/lib/usageAdoption";
import { scoreAccounts, type ScoredAccount, type UsageRow } from "@/lib/usageScore";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const row = (id: string, extra: Partial<UsageRow> = {}): UsageRow => ({
  user_id: id, nome: `Nome ${id}`, email: `${id}@example.test`, acessou_no_mes: true, dias_ativos: 2,
  leads: 0, pipeline: 0, tarefas: 0, inbox: 0, financeiro: 0, agenda: 0, clientes: 0, entregas: 0, contratos: 0, estudio: 0, ultimo_acesso: null, ...extra,
});
const account = (id: string, score: number, extra: Partial<UsageRow> = {}): ScoredAccount => ({ ...scoreAccounts([row(id, extra)])[0], score });
const engaged = account("engajado", 50, { pipeline: 3 });
const lost = account("retomar", 5, { acessou_no_mes: false, dias_ativos: 0, inbox: 80 });
const inactive = account("inativo", 0, { acessou_no_mes: false, dias_ativos: 0 });
const noPipeline = account("pipeline", 35);
const partial = account("rotina", 9, { pipeline: 1 });
const accounts = [engaged, noPipeline, partial, inactive, lost];
const previous = new Map([[lost.row.user_id, account("retomar", 40, { pipeline: 2 })]]);
const copy = vi.fn().mockResolvedValue(undefined);
const oldClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
beforeEach(() => { vi.clearAllMocks(); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copy } }); });
afterEach(() => { cleanup(); if (oldClipboard) Object.defineProperty(navigator, "clipboard", oldClipboard); else Reflect.deleteProperty(navigator, "clipboard"); });

describe("Adoption priorities", () => {
  it("uses exactly the existing access, pipeline and score threshold", () => {
    expect(adoptionStatus(account("a", 10, { pipeline: 1 }))).toBe("Engajado");
    expect(adoptionStatus(account("a", 9, { pipeline: 1 }))).toBe("Uso parcial");
    expect(adoptionStatus(account("a", 100, { pipeline: 0 }))).toBe("Uso parcial");
    expect(adoptionStatus(account("a", 100, { pipeline: 100, acessou_no_mes: false }))).toBe("Inativo");
  });
  it("prioritizes lost engagement, lack of access, missing pipeline and other partial use", () => {
    const focus = buildAdoptionFocus(accounts, previous);
    expect(focus.attention.map((item) => item.account.row.user_id)).toEqual(["retomar", "inativo", "pipeline", "rotina"]);
    expect(focus).toMatchObject({ engaged: 1, total: 5, rate: 20, inactive: 2, noPipeline: 1 });
    expect(focus.attention[0].reason).toContain("Estava engajado no mês anterior");
    expect(focus.attention[0].reason).toContain("também podem vir do celular");
    expect(focus.attention[2].action).toContain("atualizar etapas");
    expect(accounts[0]).toBe(engaged);
  });
  it("does not claim a decline without prior evidence or invent zero active days", () => {
    const focus = buildAdoptionFocus([account("a", 5, { dias_ativos: undefined })], new Map());
    expect(focus.attention[0].reason).toBe("Acessou o CRM, mas não movimentou etapas ou campos de leads no mês.");
    expect(focus.attention[0].reason).not.toContain("anterior");
  });
  it("handles empty and fully engaged samples without inventing problem accounts", () => {
    expect(buildAdoptionFocus([], new Map())).toMatchObject({ rate: 0, attention: [] });
    expect(buildAdoptionFocus([engaged], new Map())).toMatchObject({ rate: 100, attention: [] });
  });
});

describe("Team adoption summary", () => {
  it("shows named priorities, reasons and actions and opens the selected account", () => {
    const onSelect = vi.fn();
    render(<UsageAdoptionSummary accounts={accounts} previousByUser={previous} monthLabel="outubro de 2026" privacy={false} currentMonth={false} onSelect={onSelect} />);
    expect(screen.getByText(/1 de 5 contas estão engajadas \(20%\)/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. Nome retomar" })).toBeInTheDocument();
    expect(screen.getByText(/Estava engajado no mês anterior/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]);
    expect(onSelect).toHaveBeenCalledWith(lost);
  });
  it("keeps stable table aliases after priority sorting and copies no real names in privacy mode", async () => {
    render(<UsageAdoptionSummary accounts={accounts} previousByUser={previous} monthLabel="outubro de 2026" privacy currentMonth={false} onSelect={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "1. Cliente 5" })).toBeInTheDocument();
    expect(screen.queryByText(/Nome retomar/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copiar resumo" }));
    await waitFor(() => expect(copy).toHaveBeenCalledOnce());
    const text = copy.mock.calls[0][0];
    expect(text).toContain("Cliente 5"); expect(text).toContain("outubro de 2026");
    expect(text).toContain("Ação sugerida:");
    for (const item of accounts) { expect(text).not.toContain(item.row.nome); expect(text).not.toContain(item.row.email); }
  });
  it("lists all accounts on demand and labels an ongoing month", () => {
    const many = Array.from({ length: 7 }, (_, index) => account(`a${index}`, 0, { acessou_no_mes: false }));
    render(<UsageAdoptionSummary accounts={many} previousByUser={new Map()} monthLabel="novembro de 2026" privacy={false} currentMonth onSelect={vi.fn()} />);
    expect(screen.getByText(/mês em andamento/)).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Ver todas as 7 contas que precisam de atenção" }));
    expect(screen.getAllByRole("article")).toHaveLength(7);
  });
});
