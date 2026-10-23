import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute the actual Edge Function handlers with injected Supabase/Meta services.
// No live credentials, remote writes or Instagram publications are used.
function loadFunction(name: string, client: unknown, fetchMock = vi.fn()) {
  const source = readFileSync(join(process.cwd(), "supabase/functions", name, "index.ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  let handler: (req: Request) => Promise<Response>;
  runInNewContext(code, {
    exports, require: () => ({ createClient: () => client, corsHeaders: {} }),
    Deno: { env: { get: (key: string) => ({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-signing-key" })[key] ?? "test" }, serve: (fn: typeof handler) => { handler = fn; } },
    fetch: fetchMock, Request, Response, URL, URLSearchParams, TextEncoder, TextDecoder,
    crypto: webcrypto, atob, btoa, console: { error: vi.fn() }, setTimeout,
  });
  return { handle: (req: Request) => handler(req), exports };
}
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });

async function callbackRequest() {
  const payload = btoa(JSON.stringify({ uid: "owner", ts: Date.now() }));
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode("test-signing-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const state = `${payload}.${Buffer.from(sig).toString("base64url")}`;
  return new Request(`https://example.supabase.co/callback?${new URLSearchParams({ code: "code", state })}`);
}

describe("Instagram Edge Functions", () => {
  it("connects distinct profiles independently and reconnects the same profile by its identity", async () => {
    const rows = new Map<string, Record<string, unknown>>();
    const upsert = vi.fn(async (row, options) => {
      expect(options.onConflict).toBe("user_id,provider,instagram_user_id");
      const key = `${row.user_id}:${row.provider}:${row.instagram_user_id}`;
      rows.set(key, { ...row, id: rows.get(key)?.id ?? `connection-${rows.size + 1}` });
      return { error: null };
    });
    const fetchMock = vi.fn();
    const app = loadFunction("instagram-auth-callback", { from: () => ({ upsert }) }, fetchMock);
    for (const [id, username] of [["ig-a", "primeiro"], ["ig-b", "segundo"], ["ig-a", "primeiro_atualizado"]]) {
      fetchMock.mockResolvedValueOnce(json({ access_token: "short" }))
        .mockResolvedValueOnce(json({ access_token: "long", expires_in: 3600 }))
        .mockResolvedValueOnce(json({ id, username }));
      const result = await app.handle(await callbackRequest());
      expect(await result.text()).toContain("Instagram conectado!");
    }
    expect(rows.size).toBe(2);
    expect(rows.get("owner:instagram:ig-a")).toMatchObject({ id: "connection-1", username: "primeiro_atualizado" });
    expect(rows.get("owner:instagram:ig-b")).toMatchObject({ id: "connection-2", username: "segundo" });
  });

  it("tests and updates only the requested profile belonging to the effective user", async () => {
    const filters: [string, unknown][] = [];
    const updates: [string, unknown][] = [];
    const query = {
      select: vi.fn(() => query), eq: vi.fn((key, value) => { filters.push([key, value]); return query; }),
      maybeSingle: vi.fn(async () => ({ data: { id: "profile-b", access_token: "test-token", instagram_user_id: "ig-b" }, error: null })),
    };
    const updateQuery = { eq: vi.fn((key, value) => { updates.push([key, value]); return updateQuery; }), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve) };
    const app = loadFunction("test-instagram-connection", {
      auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
      from: () => ({ ...query, update: () => updateQuery }),
    }, vi.fn().mockResolvedValue(json({ user_id: "ig-b", username: "segundo" })));
    const response = await app.handle(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer test" }, body: JSON.stringify({ social_account_id: "profile-b" }) }));
    expect(response.status).toBe(200);
    expect(filters).toEqual([["id", "profile-b"], ["user_id", "owner"], ["provider", "instagram"]]);
    expect(updates).toEqual(filters);
  });

  it("rejects connection tests without a selected profile or for an unauthorized owner", async () => {
    const from = vi.fn();
    const fetchMock = vi.fn();
    const app = loadFunction("test-instagram-connection", {
      auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
      rpc: async () => ({ data: false }), from,
    }, fetchMock);
    for (const [body, status] of [[{}, 400], [{ social_account_id: "profile-b", target_user_id: "someone-else" }, 403]] as const) {
      const response = await app.handle(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer test" }, body: JSON.stringify(body) }));
      expect(response.status).toBe(status);
    }
    expect(from).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes with the profile stored on each post rather than the first connected profile", async () => {
    const accountFilters: Record<string, unknown>[] = [];
    const fetchMock = vi.fn().mockImplementation(async (url: string) => json({ id: url.endsWith("/media_publish") ? "published" : "container" }));
    const client = {
      from: (table: string) => {
        const filters: Record<string, unknown> = {};
        const query = {
          select: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query; },
          update: () => query,
          maybeSingle: async () => {
            if (table === "scheduled_posts") return { data: { id: filters.id, user_id: "owner", social_account_id: `profile-${filters.id}`, carousel_id: "carousel", status: "agendado", attempts: 0 }, error: null };
            if (table === "social_accounts") {
              accountFilters.push({ ...filters });
              return { data: { instagram_user_id: `ig-${filters.id}`, access_token: "test-token" } };
            }
            return { data: { legenda: "caption", rendered_slides: ["image.jpg"] } };
          },
        };
        return query;
      },
      storage: { from: () => ({ createSignedUrls: async () => ({ data: [{ signedUrl: "https://images.test/image.jpg" }], error: null }) }) },
    };
    const app = loadFunction("publish-instagram-carousel", client, fetchMock);
    await app.exports.publishPost("a");
    await app.exports.publishPost("b");
    expect(accountFilters).toEqual([
      { id: "profile-a", user_id: "owner", provider: "instagram" },
      { id: "profile-b", user_id: "owner", provider: "instagram" },
    ]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://graph.instagram.com/v21.0/ig-profile-a/media", "https://graph.instagram.com/v21.0/ig-profile-a/media_publish",
      "https://graph.instagram.com/v21.0/ig-profile-b/media", "https://graph.instagram.com/v21.0/ig-profile-b/media_publish",
    ]);
  });
});
