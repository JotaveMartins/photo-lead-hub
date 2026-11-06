import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { adminClientReturnPath } from "@/lib/adminClientLink";
import Auth from "@/pages/Auth";
import AdminClientEntryPage from "@/pages/AdminClientEntryPage";

const owner = "00000000-0000-0000-0000-000000000001";
const other = "00000000-0000-0000-0000-000000000002";
function endpoint({ profiles = [{ user_id: owner, meta_ad_account_id: "act_123" }], connected = false, count = 0, profileError = false } = {}) {
  let handler: (req: Request) => Promise<Response>;
  const from = vi.fn((table: string) => {
    let start = 0; let end = 999;
    const q = { select: () => q, in: () => q, eq: () => q, is: () => q, gte: () => q, lte: () => q, limit: () => q, order: () => q,
      range: (a: number, b: number) => { start = a; end = b; return q; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: table === "profiles" ? profiles.slice(start,end+1) : table === "whatsapp_instances" ? connected ? [{ user_id: owner, status: "connected" }] : [] : Array.from({ length: count }, () => ({ user_id: owner })), error: table === "profiles" && profileError ? { message: "database error" } : null })),
    };
    return q;
  });
  const source = readFileSync("supabase/functions/bi-whatsapp-leads/index.ts", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports: {}, require: () => ({ createClient: () => ({ from }) }), Deno: { env: { get: () => "test-key" }, serve: (fn: typeof handler) => { handler = fn; } }, Response });
  const call = (accounts = ["act_123"], key = "test-key") => handler(new Request("https://example.test", { method: "POST", headers: { "x-api-key": key }, body: JSON.stringify({ accounts, from: "2026-11-01", to: "2026-11-06" }) }));
  return { call, from };
}

describe("BI account client URLs", () => {
  it("returns the official HTTPS route without leads or connected WhatsApp", async () => {
    const { accounts } = await (await endpoint().call()).json();
    expect(accounts["123"]).toEqual({ in_crm: true, whatsapp_connected: false, leads: 0, client_url: `https://crm.avanzodigital.com.br/admin/clientes/${owner}` });
  });
  it("preserves lead counts and WhatsApp status", async () => {
    const { accounts } = await (await endpoint({ connected: true, count: 3 }).call(["  act_123 ", "123"])).json();
    expect(Object.keys(accounts)).toEqual(["123"]);
    expect(accounts["123"]).toMatchObject({ leads: 3, whatsapp_connected: true });
  });
  it("returns null for an account without a mapping", async () => {
    const { accounts } = await (await endpoint({ profiles: [] }).call()).json();
    expect(accounts["123"]).toEqual({ in_crm: false, whatsapp_connected: false, leads: 0, client_url: null });
  });
  it("returns null for ambiguous mappings and preserves in_crm", async () => {
    const { accounts } = await (await endpoint({ profiles: [{ user_id: owner, meta_ad_account_id: "123" }, { user_id: other, meta_ad_account_id: "act_123" }] }).call()).json();
    expect(accounts["123"]).toMatchObject({ in_crm: true, client_url: null });
  });
  it("does not mistake duplicate rows for distinct clients", async () => {
    const { accounts } = await (await endpoint({ profiles: Array(2).fill({ user_id: owner, meta_ad_account_id: "123" }) }).call()).json();
    expect(accounts["123"].client_url).toContain(owner);
  });
  it("checks matches after the first REST page before returning a URL", async () => {
    const profiles = [...Array(1000).fill({ user_id: owner, meta_ad_account_id: "123" }), { user_id: other, meta_ad_account_id: "act_123" }];
    const app = endpoint({ profiles });
    const { accounts } = await (await app.call()).json();
    expect(accounts["123"].client_url).toBeNull();
    expect(app.from.mock.calls.filter(([table]) => table === "profiles")).toHaveLength(2);
  });
  it("preserves API-key authentication before database access", async () => {
    const app = endpoint();
    expect((await app.call(["123"], "wrong")).status).toBe(401);
    expect(app.from).not.toHaveBeenCalled();
  });
  it("does not manufacture a URL after a profile query failure", async () => {
    expect((await endpoint({ profileError: true }).call()).status).toBe(500);
  });
  it("rejects external or malformed login return destinations", () => {
    expect(adminClientReturnPath(`/admin/clientes/${owner}`)).toBe(`/admin/clientes/${owner}`);
    for (const path of ["https://evil.test", "//evil.test", "/admin/clientes/invalid", `/admin/clientes/${owner}?token=secret`, undefined]) expect(adminClientReturnPath(path)).toBe("/");
  });
});

const state = vi.hoisted(() => ({ isAdmin: true, user: { id: "admin" } as { id: string } | null, start: vi.fn(), query: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user, signIn: async () => ({ error: null }), signUp: vi.fn() }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: state.isAdmin, isLoading: false }) }));
vi.mock("@/contexts/ImpersonationContext", () => ({ useImpersonation: () => ({ startImpersonation: state.start }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: state.query }) }) }) } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); state.isAdmin = true; state.user = { id: "admin" }; });
const openClient = () => render(<MemoryRouter initialEntries={[`/admin/clientes/${owner}`]}><Routes><Route path="/admin/clientes/:userId" element={<AdminClientEntryPage />} /><Route path="/leads" element={<p>Leads do cliente</p>} /></Routes></MemoryRouter>);
describe("Admin client destination", () => {
  it("loads the existing company and uses the existing impersonation flow", async () => {
    state.query.mockResolvedValue({ data: { user_id: owner, nome: "Empresa teste" }, error: null });
    openClient();
    await screen.findByText("Leads do cliente");
    expect(state.start).toHaveBeenCalledWith(owner, "Empresa teste");
  });
  it("denies non-admin users before looking up any company", async () => {
    state.isAdmin = false;
    openClient();
    expect(screen.getByRole("alert")).toHaveTextContent("Acesso restrito");
    expect(state.query).not.toHaveBeenCalled();
    expect(state.start).not.toHaveBeenCalled();
  });
  it("does not create or enter a missing company", async () => {
    state.query.mockResolvedValue({ data: null, error: null });
    openClient();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Cliente não encontrado"));
    expect(state.start).not.toHaveBeenCalled();
  });
});

describe("Login return to client", () => {
  it("keeps the client destination after submitting login", async () => {
    state.user = null;
    render(<MemoryRouter initialEntries={[{ pathname: "/auth", state: { returnTo: `/admin/clientes/${owner}` } }]}><Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin/clientes/:userId" element={<p>Destino preservado</p>} />
    </Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.test" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "example-password" } });
    fireEvent.submit(screen.getByLabelText("Email").closest("form")!);
    await screen.findByText("Destino preservado");
  });
});
