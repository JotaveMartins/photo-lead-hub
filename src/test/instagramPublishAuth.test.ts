import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { TextEncoder, TextDecoder } from "node:util";
import ts from "typescript";
import { inactiveCrmResponse } from "../../supabase/functions/_shared/account-access";
import { describe, expect, it, vi } from "vitest";

// Runs the real publish-instagram-carousel and run-scheduled-posts handlers with
// in-memory database/Instagram fakes. Nothing real is called or published.
const nodeRequire = createRequire(import.meta.url);
const SERVICE_KEY = "test-service-key";
const POST_ID = "11111111-1111-4111-8111-111111111111";

const CRON_SECRET = "private-cron-secret";
const PREVIOUS_CRON_SECRET = "previous-cron-secret";
const ENV: Record<string, string> = {
  SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  LOVABLE_CRON_SECRET: CRON_SECRET, LOVABLE_CRON_SECRET_PREVIOUS: PREVIOUS_CRON_SECRET,
};
const transpile = (path: string) => ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

// Loads the real generated cron authentication helper used by the scheduler.
function loadCronAuth(env: Record<string, string | undefined>) {
  const exports: Record<string, unknown> = {};
  runInNewContext(transpile(join(process.cwd(), "supabase/functions/_shared/cron-auth.ts")), {
    exports, require: (mod: string) => nodeRequire(mod), Deno: { env: { get: (key: string) => env[key] } }, Response,
  });
  return exports;
}

function loadFunction(name: string, client: unknown, fetchMock: (...args: any[]) => Promise<Response>, env: Record<string, string | undefined> = ENV) {
  const code = transpile(join(process.cwd(), "supabase/functions", name, "index.ts"));
  let handler: (req: Request) => Promise<Response>;
  runInNewContext(code, {
    exports: {},
    require: (mod: string) => mod.includes("account-access.ts") ? { inactiveCrmResponse }
      : mod.includes("cron-auth.ts") ? loadCronAuth(env)
      : { createClient: () => client },
    Deno: {
      env: { get: (key: string) => env[key] },
      serve: (fn: typeof handler) => { handler = fn; },
    },
    fetch: fetchMock, Request, Response, URL, URLSearchParams, TextEncoder, TextDecoder,
    AbortSignal: { timeout: () => new AbortController().signal },
    console: { error: vi.fn() }, setTimeout: (fn: () => void) => setTimeout(fn, 0), Date,
  });
  return (req: Request) => handler(req);
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

type Options = {
  status?: string; attempts?: number; scheduledAt?: string; owner?: string;
  carouselOwner?: string; accountOwner?: string; admins?: string[];
};

function setup(opts: Options = {}) {
  const owner = opts.owner ?? "owner";
  const post: Record<string, any> = {
    id: POST_ID, user_id: owner, carousel_id: "carousel", social_account_id: "account",
    status: opts.status ?? "agendado", attempts: opts.attempts ?? 0,
    scheduled_at: opts.scheduledAt ?? new Date(Date.now() - 60_000).toISOString(),
    instagram_media_id: opts.status === "publicado" ? "stored-media" : null,
    instagram_permalink: opts.status === "publicado" ? "https://www.instagram.com/p/Stored/" : null,
  };
  const users: Record<string, Record<string, unknown>> = {
    "owner-jwt": { sub: owner, role: "authenticated" },
    "other-jwt": { sub: "intruder", role: "authenticated" },
    "admin-jwt": { sub: "agency-admin", role: "authenticated" },
    "anon-jwt": { role: "anon" },
  };
  const admins = opts.admins ?? ["agency-admin"];
  const from = vi.fn((table: string) => {
    const filters: Record<string, unknown> = {};
    let patch: Record<string, unknown> | null = null;
    let statusIn: string[] | null = null;
    const apply = () => {
      const ok = (!statusIn || statusIn.includes(post.status)) && (!("attempts" in filters) || filters.attempts === post.attempts);
      if (ok && filters.id === post.id) Object.assign(post, patch);
      patch = null;
      return ok;
    };
    const q: any = {
      select: () => q,
      eq: (k: string, v: unknown) => { filters[k] = v; return q; },
      in: (_k: string, v: string[]) => { statusIn = v; return q; },
      update: (p: Record<string, unknown>) => { patch = p; return q; },
      then: (resolve: (v: unknown) => unknown) => { if (patch) apply(); return Promise.resolve(resolve({ error: null })); },
      maybeSingle: async () => {
        if (table === "scheduled_posts") {
          if (patch) return { data: apply() ? { id: post.id } : null, error: null };
          return { data: filters.id === post.id ? { ...post } : null, error: null };
        }
        if (table === "carousels") return { data: { user_id: opts.carouselOwner ?? owner, legenda: "Legenda #tag", rendered_slides: ["one.jpg"] }, error: null };
        const account = { user_id: opts.accountOwner ?? owner, provider: "instagram", instagram_user_id: "ig-1", access_token: "private-token", username: "perfil" };
        if ("user_id" in filters && filters.user_id !== account.user_id) return { data: null, error: null };
        return { data: account, error: null };
      },
    };
    return q;
  });
  const client = {
    auth: { getClaims: vi.fn(async (token: string) => users[token] ? { data: { claims: users[token] }, error: null } : { data: null, error: new Error("invalid JWT") }) },
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => ({ data: name === "has_role" ? admins.includes(args._user_id as string) : true, error: null })),
    from,
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [{ signedUrl: "https://images.test/one.jpg" }], error: null }) }) },
  };
  const graph = vi.fn(async (url: string) => {
    if (url.includes("fields=permalink")) return json({ permalink: "https://www.instagram.com/p/RealPost/" });
    return json({ id: url.endsWith("/media_publish") ? "real-media-id" : "container" });
  });
  const handle = loadFunction("publish-instagram-carousel", client, graph);
  const call = (token?: string, body: unknown = { post_id: POST_ID }) => handle(new Request("https://example.supabase.co/functions/v1/publish-instagram-carousel", {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  }));
  const publishCalls = () => graph.mock.calls.filter(([url]) => String(url).endsWith("/media_publish")).length;
  return { post, call, graph, from, publishCalls, handle };
}

describe("publish-instagram-carousel authentication", () => {
  it("returns 401 without Authorization and touches nothing", async () => {
    const { call, from, graph } = setup();
    const res = await call();
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token, the public anon key, or a wrong service key", async () => {
    const { call, graph, post } = setup();
    for (const token of ["forged-token", "anon-jwt", "test-service-ke", "test-service-keyX"]) {
      expect((await call(token)).status).toBe(401);
    }
    expect(graph).not.toHaveBeenCalled();
    expect(post.status).toBe("agendado");
  });

  it("returns 400 for a missing or malformed post id after authenticating", async () => {
    const { call } = setup();
    expect((await call("owner-jwt", {})).status).toBe(400);
    expect((await call("owner-jwt", { post_id: "not-a-uuid" })).status).toBe(400);
  });
});

describe("manual publication (Studio)", () => {
  it("returns 403 to a signed-in user who does not own the post and is not admin", async () => {
    const { call, graph, post } = setup();
    const res = await call("other-jwt");
    expect(res.status).toBe(403);
    expect(graph).not.toHaveBeenCalled();
    expect(post).toMatchObject({ status: "agendado", attempts: 0 });
  });

  it("publishes for the owner and stores the Instagram ID and permalink", async () => {
    const { call, post, publishCalls } = setup();
    const res = await call("owner-jwt");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, media_id: "real-media-id", permalink: "https://www.instagram.com/p/RealPost/" });
    expect(publishCalls()).toBe(1);
    expect(post).toMatchObject({ status: "publicado", instagram_media_id: "real-media-id", instagram_permalink: "https://www.instagram.com/p/RealPost/", attempts: 1 });
  });

  it("lets an agency admin publish a client's post (impersonation)", async () => {
    const { call, publishCalls } = setup();
    expect((await call("admin-jwt")).status).toBe(200);
    expect(publishCalls()).toBe(1);
  });

  it("returns 403 when the Instagram profile belongs to another account", async () => {
    const { call, graph, post } = setup({ accountOwner: "someone-else" });
    expect((await call("owner-jwt")).status).toBe(403);
    expect((await call("admin-jwt")).status).toBe(403);
    expect(graph).not.toHaveBeenCalled();
    expect(post.status).toBe("agendado");
  });

  it("returns 403 when the carousel belongs to another account", async () => {
    const { call, graph } = setup({ carouselOwner: "someone-else" });
    expect((await call("owner-jwt")).status).toBe(403);
    expect(graph).not.toHaveBeenCalled();
  });

  it("returns stored ID/link for an already published post without publishing again", async () => {
    const { call, graph } = setup({ status: "publicado" });
    const res = await call("owner-jwt");
    expect(await res.json()).toMatchObject({ alreadyPublished: true, media_id: "stored-media", permalink: "https://www.instagram.com/p/Stored/" });
    expect(graph).not.toHaveBeenCalled();
  });

  it("does not leak a published post's data to a non-owner", async () => {
    const { call } = setup({ status: "publicado" });
    const res = await call("other-jwt");
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain("stored-media");
  });

  it("refuses posts already being published or cancelled (409) without calling Instagram", async () => {
    for (const status of ["publicando", "cancelado"]) {
      const { call, graph } = setup({ status });
      expect((await call("owner-jwt")).status).toBe(409);
      expect(graph).not.toHaveBeenCalled();
    }
  });

  it("publishes only once when the user clicks and the scheduler fires at the same time", async () => {
    const { call, publishCalls } = setup();
    const statuses = (await Promise.all([call("owner-jwt"), call(SERVICE_KEY)])).map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    expect(publishCalls()).toBe(1);
  });
});

describe("scheduled publication (service-to-service)", () => {
  it("accepts the backend service key for a due post", async () => {
    const { call, post, publishCalls } = setup();
    expect((await call(SERVICE_KEY)).status).toBe(200);
    expect(publishCalls()).toBe(1);
    expect(post.status).toBe("publicado");
  });

  it("returns 403 to the scheduler for a post that is not due yet or out of retries", async () => {
    for (const opts of [{ scheduledAt: new Date(Date.now() + 3_600_000).toISOString() }, { status: "falhou", attempts: 3 }]) {
      const { call, graph } = setup(opts);
      expect((await call(SERVICE_KEY)).status).toBe(403);
      expect(graph).not.toHaveBeenCalled();
    }
  });

  it("rejects the private cron secret on the publish function itself", async () => {
    const { call, graph } = setup();
    expect((await call(CRON_SECRET)).status).toBe(401);
    expect(graph).not.toHaveBeenCalled();
  });
});

describe("run-scheduled-posts private scheduler authentication", () => {
  function scheduler(env: Record<string, string | undefined> = ENV) {
    const target = setup();
    const schedulerQuery: any = { select: () => schedulerQuery, in: () => schedulerQuery, lte: () => schedulerQuery, lt: () => schedulerQuery, limit: vi.fn(async () => ({ data: [{ id: POST_ID, attempts: 0 }], error: null })) };
    const from = vi.fn(() => schedulerQuery);
    const forwarded: Request[] = [];
    const handle = loadFunction("run-scheduled-posts", { from }, async (url: string, init: RequestInit) => {
      const req = new Request(url, init);
      forwarded.push(req.clone());
      return target.handle(req);
    }, env);
    const run = (headers: Record<string, string> = {}, method = "POST") => handle(new Request("https://example.supabase.co/functions/v1/run-scheduled-posts", { method, headers, body: method === "POST" ? "{}" : undefined }));
    return { target, from, forwarded, run };
  }
  const ANON = "eyJhbGciOiJIUzI1NiJ9.public-anon-key.signature";

  it("publishes a due post when called with the private cron secret", async () => {
    const s = scheduler();
    const res = await s.run({ Authorization: `Bearer ${CRON_SECRET}` });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 1, results: { [POST_ID]: "publicado" } });
    expect(s.forwarded[0].headers.get("Authorization")).toBe(`Bearer ${SERVICE_KEY}`);
    expect(s.target.publishCalls()).toBe(1);
    expect(s.target.post.status).toBe("publicado");
  });

  it("keeps working with the previous secret during a rotation", async () => {
    const s = scheduler();
    expect((await s.run({ Authorization: `Bearer ${PREVIOUS_CRON_SECRET}` })).status).toBe(200);
    expect(s.target.publishCalls()).toBe(1);
  });

  it("returns 401 without credentials and never reads posts or calls Instagram", async () => {
    const s = scheduler();
    expect((await s.run()).status).toBe(401);
    expect(s.from).not.toHaveBeenCalled();
    expect(s.target.graph).not.toHaveBeenCalled();
  });

  it("returns 401 to external triggers using the public key, a user token, the service key or a wrong secret", async () => {
    const s = scheduler();
    for (const headers of [
      { apikey: ANON },
      { apikey: ANON, Authorization: `Bearer ${ANON}` },
      { Authorization: "Bearer owner-jwt" },
      { Authorization: `Bearer ${SERVICE_KEY}` },
      { Authorization: `Bearer ${CRON_SECRET}x` },
      { Authorization: CRON_SECRET },
    ]) {
      expect((await s.run(headers)).status).toBe(401);
    }
    expect(s.from).not.toHaveBeenCalled();
    expect(s.target.publishCalls()).toBe(0);
    expect(s.target.post).toMatchObject({ status: "agendado", attempts: 0 });
  });

  it("rejects non-POST calls", async () => {
    const s = scheduler();
    expect((await s.run({ Authorization: `Bearer ${CRON_SECRET}` }, "GET")).status).toBe(405);
    expect(s.from).not.toHaveBeenCalled();
  });

  it("fails closed when the cron secret is not configured", async () => {
    const s = scheduler({ ...ENV, LOVABLE_CRON_SECRET: undefined });
    expect((await s.run({ Authorization: "Bearer undefined" })).status).toBe(500);
    expect(s.from).not.toHaveBeenCalled();
  });
});
