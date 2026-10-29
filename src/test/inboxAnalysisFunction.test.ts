import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as reportHelpers from "../../supabase/functions/analyze-inbox-service/report";

const owner = "00000000-0000-0000-0000-000000000001";
const other = "00000000-0000-0000-0000-000000000002";
const sample = [{ contact_name: "Ana Teste", contact_number: "5511999990000", started_at: "2026-10-01T10:00:00Z", messages: [{ body: "Olá, anúncio", direction: "inbound", type: "text", sent_at: "2026-10-01T10:00:00Z" }] }];
const report = {
  summary: "Processo observado", stages: [1,2,3].map((n) => ({ title: `Etapa ${n}`, observed: "Há uma pergunta", suggestedMessage: "Olá, [nome]" })),
  strengths: [], improvements: [], limitations: [], cases: [{ conversation: "Conversa 01", observed: "Sem resposta adicional", nextStep: "Retomar" }],
};
function setup({ isAdmin = false, selected = sample, provider = "openai", responseStatus = 200 } = {}) {
  let handler: (request: Request) => Promise<Response>;
  const rpc = vi.fn(async (name: string) => ({ data: name === "has_role" ? isAdmin : selected, error: null }));
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { value: { provider, openai_model: "gpt-4o" } }, error: null }) };
  const client = { auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) }, rpc, from: () => query };
  const fetchMock = vi.fn(async (_url: string, _options: unknown) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(report) } }] }), { status: responseStatus }));
  const code = ts.transpileModule(readFileSync("supabase/functions/analyze-inbox-service/index.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, {
    exports: {}, require: (name: string) => name.includes("report.ts") ? reportHelpers : { createClient: () => client },
    Deno: { env: { get: () => "test-value" }, serve: (fn: typeof handler) => { handler = fn; } },
    Response, AbortSignal: { timeout: () => new AbortController().signal }, fetch: fetchMock,
  });
  const call = (body: unknown, auth = true) => handler(new Request("https://example.test", { method: "POST", headers: auth ? { Authorization: "Bearer test" } : {}, body: JSON.stringify(body) }));
  return { call, rpc, fetchMock };
}

describe("Inbox analysis endpoint permissions and generation", () => {
  it("rejects unauthenticated requests before database or AI access", async () => {
    const app = setup();
    expect((await app.call({ entry_message: "Olá, anúncio" }, false)).status).toBe(401);
    expect(app.rpc).not.toHaveBeenCalled(); expect(app.fetchMock).not.toHaveBeenCalled();
  });
  it("denies another account before loading any conversation", async () => {
    const app = setup();
    expect((await app.call({ target_user_id: other, entry_message: "Olá, anúncio" })).status).toBe(403);
    expect(app.rpc).toHaveBeenCalledTimes(1); expect(app.rpc).toHaveBeenCalledWith("has_role", expect.anything());
    expect(app.fetchMock).not.toHaveBeenCalled();
  });
  it("selects only the current account and returns real identities with validated analysis", async () => {
    const app = setup();
    const response = await app.call({ entry_message: "Olá, anúncio" });
    expect(response.status).toBe(200);
    expect(app.rpc).toHaveBeenCalledWith("get_inbox_analysis_sample", { p_user_id: owner, p_entry_message: "Olá, anúncio" });
    expect(app.fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
    expect((await response.json()).sample.contacts).toEqual([{ conversation: "Conversa 01", name: "Ana Teste", phone: "5511999990000" }]);
  });
  it("allows an authenticated admin to analyze the explicitly selected account", async () => {
    const app = setup({ isAdmin: true });
    expect((await app.call({ target_user_id: other, entry_message: "Olá, anúncio" })).status).toBe(200);
    expect(app.rpc).toHaveBeenLastCalledWith("get_inbox_analysis_sample", { p_user_id: other, p_entry_message: "Olá, anúncio" });
  });
  it("does not call or charge AI when no conversation matches", async () => {
    const app = setup({ selected: [] });
    expect((await app.call({ entry_message: "Olá, anúncio" })).status).toBe(404);
    expect(app.fetchMock).not.toHaveBeenCalled();
  });
  it("rejects oversized histories instead of silently truncating them", async () => {
    const app = setup({ selected: [{ ...sample[0], messages: Array(1001).fill(sample[0].messages[0]) }] });
    expect((await app.call({ entry_message: "Olá, anúncio" })).status).toBe(413);
    expect(app.fetchMock).not.toHaveBeenCalled();
  });
  it("propagates rate limiting and never silently switches the billing provider", async () => {
    const app = setup({ responseStatus: 429 });
    expect((await app.call({ entry_message: "Olá, anúncio" })).status).toBe(429);
    expect(app.fetchMock).toHaveBeenCalledTimes(1);
  });
});
