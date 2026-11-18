import { describe, expect, it } from "vitest";
import {
  MB, declaredFileLength, isOverMediaLimit, mediaLimitBytes, overLimitBody,
} from "../../supabase/functions/_shared/media-limits";

describe("WhatsApp media size limits", () => {
  it("photos are downloaded up to 2 MB", () => {
    expect(isOverMediaLimit("image", "image/jpeg", 2 * MB)).toBe(false);
    expect(isOverMediaLimit("image", "image/jpeg", 2 * MB + 1)).toBe(true);
  });
  it("videos are downloaded up to 5 MB", () => {
    expect(isOverMediaLimit("video", "video/quicktime", 5 * MB)).toBe(false);
    expect(isOverMediaLimit("video", "video/quicktime", 5 * MB + 1)).toBe(true);
  });
  it("photos sent as document follow the 2 MB photo rule", () => {
    expect(mediaLimitBytes("document", "image/png")).toBe(2 * MB);
    expect(isOverMediaLimit("document", "image/png", 3 * MB)).toBe(true);
  });
  it("other documents such as PDFs are downloaded up to 5 MB", () => {
    expect(isOverMediaLimit("document", "application/pdf", 3 * MB)).toBe(false);
    expect(isOverMediaLimit("document", "application/pdf", 6 * MB)).toBe(true);
  });
  it("unknown size is not cut before download", () => {
    expect(isOverMediaLimit("video", "video/mp4", null)).toBe(false);
  });
  it("reads WhatsApp file sizes as number, text or protobuf Long", () => {
    expect(declaredFileLength(3145728)).toBe(3145728);
    expect(declaredFileLength("3145728")).toBe(3145728);
    expect(declaredFileLength({ low: 3145728, high: 0, unsigned: true })).toBe(3145728);
    expect(declaredFileLength(undefined)).toBeNull();
    expect(declaredFileLength("abc")).toBeNull();
  });
  it("heavy files become a notice that keeps the caption", () => {
    expect(overLimitBody("video", "video/mp4", "Making of")).toBe("🎬 Vídeo acima de 5 MB — veja no WhatsApp\nMaking of");
    expect(overLimitBody("document", "image/png", null)).toBe("📷 Foto acima de 2 MB — veja no WhatsApp");
  });
});

import { vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { whatsappSentAt } from "../../supabase/functions/_shared/whatsapp-time";
import * as mediaLimits from "../../supabase/functions/_shared/media-limits";

function loadWebhook(instanceRow: unknown) {
  let handler!: (req: Request) => Promise<Response>;
  const inserted: any[] = [];
  const fetchMock = vi.fn(async () => new Response("{}"));
  const conversation = { id: "conv", user_id: "owner", lead_id: "lead", status: "open", contact_number: "5585000000000", unread_count: 0 };
  const from = (table: string) => {
    const q: any = {
      select: () => q, eq: () => q, or: () => q, order: () => q, limit: () => q, is: () => q, gte: () => q, update: () => q,
      insert: (row: unknown) => { if (table === "inbox_messages") inserted.push(row); return q; },
      maybeSingle: async () => ({ data: table === "whatsapp_instances" ? instanceRow : table === "inbox_conversations" ? conversation : null, error: null }),
      single: async () => ({ data: { id: "message" }, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ data: [], error: null })),
    };
    return q;
  };
  const source = ts.transpileModule(readFileSync("supabase/functions/evolution-webhook/index.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, {
    exports: {}, Response, fetch: fetchMock, crypto, AbortSignal,
    require: (name: string) => name.includes("whatsapp-time") ? { whatsappSentAt } : name.includes("media-limits") ? mediaLimits : name.includes("qrcode") ? {} : { createClient: () => ({ from, storage: { from: () => ({}) } }) },
    Deno: { env: { get: () => "synthetic" }, serve: (fn: typeof handler) => { handler = fn; } },
    console: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
  });
  const send = (data: unknown) => handler(new Request("https://example.test", { method: "POST", body: JSON.stringify({ event: "MESSAGES_UPSERT", instance: "synthetic", data }) }));
  return { send, inserted, fetchMock };
}

describe("WhatsApp webhook with heavy media", () => {
  const key = { id: "m1", remoteJid: "5585000000000@s.whatsapp.net", fromMe: false };

  it("answers 200 for WhatsApps that belong to no CRM account", async () => {
    const { send, inserted } = loadWebhook(null);
    const res = await send({ key, message: { conversation: "oi" } });
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(0);
  });

  it("saves a 50 MB video as a notice without downloading it", async () => {
    const { send, inserted, fetchMock } = loadWebhook({ id: "inst", user_id: "owner" });
    const res = await send({ key, message: { videoMessage: { mimetype: "video/quicktime", fileLength: String(50 * MB), caption: "Prévia" } } });
    expect(res.status).toBe(200);
    expect(inserted[0].body).toBe("🎬 Vídeo acima de 5 MB — veja no WhatsApp\nPrévia");
    expect(inserted[0].media_url).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a 3 MB photo as a notice without downloading it", async () => {
    const { send, inserted, fetchMock } = loadWebhook({ id: "inst", user_id: "owner" });
    await send({ key, message: { imageMessage: { mimetype: "image/jpeg", fileLength: 3 * MB } } });
    expect(inserted[0].body).toBe("📷 Foto acima de 2 MB — veja no WhatsApp");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
