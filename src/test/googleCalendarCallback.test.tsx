import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";
import ts from "typescript";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GoogleCalendarOAuthCallbackPage from "@/pages/GoogleCalendarOAuthCallbackPage";
import { googleCalendarErrorMessage } from "@/lib/googleCalendarOAuth";
import { inactiveCrmResponse } from "../../supabase/functions/_shared/account-access";

function loadFunction(name: string, client: unknown, fetchMock = vi.fn()) {
  let handler: (req: Request) => Promise<Response>;
  const code = ts.transpileModule(readFileSync(`supabase/functions/${name}/index.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, {
    exports: {}, require: (path: string) => path.includes("account-access.ts") ? { inactiveCrmResponse } : { createClient: () => client, corsHeaders: {} },
    Deno: { env: { get: (key: string) => ({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-signing-key" })[key] ?? "test-config" }, serve: (fn: typeof handler) => { handler = fn; } },
    fetch: fetchMock, Request, Response, URL, URLSearchParams, TextEncoder, TextDecoder, crypto: webcrypto, atob, btoa, console: { error: vi.fn() },
  });
  return (req: Request) => handler(req);
}
async function signedState(origin = "https://preview.example.test", tsValue = Date.now()) {
  const payload = btoa(JSON.stringify({ uid: "owner", ts: tsValue, origin }));
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode("test-signing-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${Buffer.from(signature).toString("base64url")}`;
}
const callbackRequest = async (extra = {}, origin?: string) => new Request(`https://example.supabase.co/functions/v1/google-calendar-auth-callback?${new URLSearchParams({ code: "test-code", state: await signedState(origin), ...extra })}`);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

const oldOpener = Object.getOwnPropertyDescriptor(window, "opener");
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks();
  if (oldOpener) Object.defineProperty(window, "opener", oldOpener); else Reflect.deleteProperty(window, "opener");
});

describe("Google Calendar callback redirect", () => {
  it("saves the connection and redirects to the signed CRM origin without HTML or secrets", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ access_token: "test-access", refresh_token: "test-refresh", expires_in: 3600, scope: "calendar.events.owned" }))
      .mockResolvedValueOnce(json({ email: "account@example.test" }));
    const handler = loadFunction("google-calendar-auth-callback", { from: () => ({ upsert }) }, fetchMock);
    const result = await handler(await callbackRequest());
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toBe("https://preview.example.test/oauth/google-calendar/callback?result=success");
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(await result.text()).toBe("");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "owner", google_email: "account@example.test", calendar_id: "primary", access_token: "test-access", refresh_token: "test-refresh" }), { onConflict: "user_id" });
    const options = fetchMock.mock.calls[0][1];
    expect(options.body.get("redirect_uri")).toBe("https://example.supabase.co/functions/v1/google-calendar-auth-callback");
    expect(result.headers.get("location")).not.toContain("account@example.test");
    expect(result.headers.get("location")).not.toContain("test-access");
  });
  it("redirects denied authorization to the verified origin without contacting Google or saving", async () => {
    const fetchMock = vi.fn(); const from = vi.fn();
    const handler = loadFunction("google-calendar-auth-callback", { from }, fetchMock);
    const result = await handler(await callbackRequest({ error: "access_denied" }));
    expect(result.headers.get("location")).toBe("https://preview.example.test/oauth/google-calendar/callback?result=error&reason=denied");
    expect(fetchMock).not.toHaveBeenCalled(); expect(from).not.toHaveBeenCalled();
  });
  it("rejects malformed or expired state and does not trust its redirect origin", async () => {
    const fetchMock = vi.fn();
    const handler = loadFunction("google-calendar-auth-callback", {}, fetchMock);
    for (const state of ["broken-state", "%%%%.%%%%", await signedState("https://untrusted.example.test", Date.now() - 11 * 60 * 1000)]) {
      const result = await handler(await callbackRequest({ state }));
      expect(result.status).toBe(303);
      expect(result.headers.get("location")).toBe("https://crm.avanzodigital.com.br/oauth/google-calendar/callback?result=error&reason=invalid_state");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not echo provider error text or redirect to unsafe protocols", async () => {
    const handler = loadFunction("google-calendar-auth-callback", {}, vi.fn().mockResolvedValue(json({ error_description: "<script>private-provider-detail</script>" }, 400)));
    const result = await handler(await callbackRequest({}, "javascript:alert(1)"));
    expect(result.headers.get("location")).toBe("https://crm.avanzodigital.com.br/oauth/google-calendar/callback?result=error&reason=token_exchange_failed");
    expect(await result.text()).toBe("");
  });
  it("does not change OAuth scopes, consent behavior or registered callback URI", async () => {
    const client = { auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) }, rpc: async () => ({ data: true, error: null }) };
    const handler = loadFunction("google-calendar-auth-start", client);
    const response = await handler(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer test" }, body: JSON.stringify({ origin: "https://preview.example.test" }) }));
    const url = new URL((await response.json()).authUrl);
    expect(url.searchParams.get("scope")?.split(" ")).toEqual(["https://www.googleapis.com/auth/calendar.events.owned", "https://www.googleapis.com/auth/userinfo.email", "openid"]);
    expect(url.searchParams.has("include_granted_scopes")).toBe(false);
    expect(url.searchParams.get("redirect_uri")).toBe("https://example.supabase.co/functions/v1/google-calendar-auth-callback");
  });
});

describe("Google Calendar completion page", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  it("shows success, notifies only its own origin and closes the popup", async () => {
    const postMessage = vi.fn(); const close = vi.spyOn(window, "close").mockImplementation(() => {});
    Object.defineProperty(window, "opener", { configurable: true, value: { closed: false, postMessage } });
    render(<MemoryRouter initialEntries={["/oauth/google-calendar/callback?result=success"]}><GoogleCalendarOAuthCallbackPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Google Agenda conectado!" })).toBeInTheDocument();
    expect(postMessage).toHaveBeenCalledWith({ type: "google-calendar-auth", success: true, reason: null }, window.location.origin);
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(close).toHaveBeenCalledOnce();
  });
  it("shows readable failure with a manual return link instead of raw error HTML", () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, "opener", { configurable: true, value: { closed: false, postMessage } });
    render(<MemoryRouter initialEntries={["/oauth/google-calendar/callback?result=error&reason=denied"]}><GoogleCalendarOAuthCallbackPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Não foi possível conectar" })).toBeInTheDocument();
    expect(screen.getByText(/A autorização foi cancelada ou recusada/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar às Integrações" })).toHaveAttribute("href", "/integracoes");
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ success: false, reason: "denied" }), window.location.origin);
    expect(typeof googleCalendarErrorMessage("constructor")).toBe("string");
  });
  it("still offers a return path when the browser has removed the opener", () => {
    Object.defineProperty(window, "opener", { configurable: true, value: null });
    render(<MemoryRouter initialEntries={["/oauth/google-calendar/callback?result=success"]}><GoogleCalendarOAuthCallbackPage /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Voltar às Integrações" })).toBeInTheDocument();
  });
});
