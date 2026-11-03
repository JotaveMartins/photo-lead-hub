import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TrialBanner from "@/components/account/TrialBanner";
import AccountAccessGate from "@/components/account/AccountAccessGate";
import AssinaturaPage from "@/pages/AssinaturaPage";
import AccountAccessTab from "@/components/admin/AccountAccessTab";
import Auth from "@/pages/Auth";
import { accountAccessSchema, supportUrl } from "@/lib/accountAccess";
import { inactiveCrmResponse } from "../../supabase/functions/_shared/account-access";

const mocks = vi.hoisted(() => ({
  access: {} as Record<string, unknown>, adminRows: [] as unknown[], isAdmin: false,
  user: { id: "owner" } as { id: string } | null,
  refetch: vi.fn(), manage: vi.fn(), signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), toastError: vi.fn(),
}));
vi.mock("@/hooks/useAccountAccess", () => ({
  useAccountAccess: () => mocks.access,
  useAdminAccountAccess: () => ({ data: mocks.adminRows, isLoading: false, isError: false }),
  useManageAccountAccess: () => ({ mutate: mocks.manage, isPending: false }),
}));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: mocks.isAdmin }) }));
vi.mock("@/hooks/useEffectiveUserId", () => ({ useEffectiveUserId: () => "owner" }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user, loading: false, signUp: mocks.signUp, signIn: mocks.signIn, signOut: mocks.signOut }) }));
vi.mock("@/hooks/usePrivacyMode", () => ({ usePrivacyMode: () => ({ enabled: false }), maskName: () => "Conta", maskEmail: () => "email" }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));
const access = (extra = {}) => ({ user_id: "owner", status: "trial", mode: "trial", allowed: true, plan: null, trial_started_at: "2026-11-03T12:00:00Z", expires_at: "2027-01-02T12:00:00Z", server_now: "2026-11-03T12:00:00Z", days_remaining: 60, ...extra });
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: "owner" }; mocks.isAdmin = false; mocks.access = { data: access(), isLoading: false, isError: false, refetch: mocks.refetch }; mocks.adminRows = []; });
afterEach(cleanup);

describe("Trial access UI and backend boundary", () => {
  it("shows server-provided remaining days and a link to plans at the top", () => {
    render(<MemoryRouter><TrialBanner /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("60 dias restantes");
    expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute("href", "/assinatura");
  });
  it("uses singular on the final day and does not show trial banners for legacy accounts", () => {
    mocks.access.data = access({ days_remaining: 1 });
    const { rerender } = render(<MemoryRouter><TrialBanner /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("1 dia restante");
    mocks.access.data = access({ status: "legacy", mode: "legacy", days_remaining: 0 });
    rerender(<MemoryRouter><TrialBanner /></MemoryRouter>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("redirects expired users to plans while active users can use the CRM", () => {
    mocks.access.data = access({ status: "expired", allowed: false, days_remaining: 0 });
    render(<MemoryRouter initialEntries={["/"]}><Routes><Route path="/" element={<AccountAccessGate><p>CRM privado</p></AccountAccessGate>} /><Route path="/assinatura" element={<p>Planos e contato</p>} /></Routes></MemoryRouter>);
    expect(screen.getByText("Planos e contato")).toBeInTheDocument();
    expect(screen.queryByText("CRM privado")).not.toBeInTheDocument();
  });
  it("does not grant access if the check fails, and preserves admin access", () => {
    mocks.access = { isError: true, refetch: mocks.refetch };
    const { rerender } = render(<MemoryRouter><AccountAccessGate><p>CRM privado</p></AccountAccessGate></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível verificar seu acesso");
    expect(screen.queryByText("CRM privado")).not.toBeInTheDocument();
    mocks.isAdmin = true;
    rerender(<MemoryRouter><AccountAccessGate><p>CRM privado</p></AccountAccessGate></MemoryRouter>);
    expect(screen.getByText("CRM privado")).toBeInTheDocument();
  });
  it("shows total semester/year prices and the exact provided WhatsApp number after expiry", () => {
    mocks.access.data = access({ status: "expired", allowed: false, days_remaining: 0 });
    render(<MemoryRouter><AssinaturaPage /></MemoryRouter>);
    expect(screen.getByText("Seu teste grátis chegou ao fim")).toBeInTheDocument();
    expect(screen.getByText("R$ 300")).toBeInTheDocument(); expect(screen.getByText("R$ 500")).toBeInTheDocument();
    expect(screen.getByText("Valor total por 6 meses de acesso.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "(61) 3306-1009" })).toHaveAttribute("href", supportUrl());
    expect(supportUrl()).toContain("wa.me/556133061009?");
    expect(screen.queryByRole("link", { name: "Voltar ao CRM" })).not.toBeInTheDocument();
  });
  it("lets the admin extend a trial without creating a payment", () => {
    mocks.adminRows = [{ nome: "Teste", email: "teste@example.test", created_at: "2026-11-03", access: access() }];
    render(<AccountAccessTab />);
    fireEvent.click(screen.getByRole("button", { name: "Gerenciar" }));
    fireEvent.change(screen.getByLabelText("Dias adicionais"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Observação"), { target: { value: "Ajuste por suporte" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar alteração" }));
    expect(mocks.manage).toHaveBeenCalledWith({ userId: "owner", action: "extend_trial", days: 10, note: "Ajuste por suporte" }, expect.anything());
  });
  it("waits for email confirmation instead of announcing an active session", async () => {
    mocks.user = null;
    mocks.signUp.mockResolvedValue({ error: null, needsEmailConfirmation: true });
    render(<MemoryRouter><Auth mode="signup" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Cliente Teste" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "teste@example.test" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "Teste12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Começar meu teste grátis" }));
    await screen.findByText("Confirme seu e-mail");
    expect(screen.getByText(/Os 60 dias grátis começam após a confirmação/)).toBeInTheDocument();
    expect(mocks.signUp).toHaveBeenCalledWith("teste@example.test", "Teste12345", "Cliente Teste");
  });
  it("requires a stronger password for public signup without changing existing login rules", async () => {
    mocks.user = null;
    render(<MemoryRouter><Auth mode="signup" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Teste" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "teste@example.test" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Começar meu teste grátis" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Use uma senha com pelo menos 8 caracteres"));
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("rejects malformed access snapshots and blocks expired service operations", async () => {
    expect(() => accountAccessSchema.parse(access({ days_remaining: -1 }))).toThrow();
    const expired = await inactiveCrmResponse({ rpc: async () => ({ data: false, error: null }) }, "owner", {});
    expect(expired?.status).toBe(403);
    const unavailable = await inactiveCrmResponse({ rpc: async () => ({ data: null, error: "database error" }) }, "owner", {});
    expect(unavailable?.status).toBe(503);
    expect(await inactiveCrmResponse({ rpc: async () => ({ data: true, error: null }) }, "owner", {})).toBeNull();
  });
});
