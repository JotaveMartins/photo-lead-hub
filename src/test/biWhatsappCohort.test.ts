import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
const owner = "00000000-0000-0000-0000-000000000001";
const other = "00000000-0000-0000-0000-000000000002";
type Lead = { id: string; user_id: string; origem: string; deleted_at: string | null; data_contato: string | null; created_at: string };
const lead = (id: string, extra: Partial<Lead> = {}): Lead => ({ id, user_id: owner, origem: "Tráfego Pago", deleted_at: null, data_contato: null, created_at: "2026-11-20T12:00:00Z", ...extra });
function endpoint(leads: Lead[], profiles = [{ user_id: owner, meta_ad_account_id: "act_123" }]) {
  let handler: (request: Request) => Promise<Response>;
  const from = vi.fn((table: string) => {
    let filters: ((row: Record<string, unknown>) => boolean)[] = [];
    let first = 0, last = 999;
    const compare = (row: Record<string, unknown>, key: string, value: string, predicate: (a: number | string, b: number | string) => boolean) => {
      if (row[key] == null) return false;
      return predicate(key === "created_at" ? Date.parse(String(row[key])) : String(row[key]), key === "created_at" ? Date.parse(value) : value);
    };
    const q = {
      select: () => q, order: () => q,
      in: (key: string, values: unknown[]) => { filters.push(r => values.includes(r[key])); return q; },
      eq: (key: string, value: unknown) => { filters.push(r => r[key] === value); return q; },
      is: (key: string, value: unknown) => { filters.push(r => r[key] === value); return q; },
      gte: (key: string, value: string) => { filters.push(r => compare(r, key, value, (a, b) => a >= b)); return q; },
      lte: (key: string, value: string) => { filters.push(r => compare(r, key, value, (a, b) => a <= b)); return q; },
      lt: (key: string, value: string) => { filters.push(r => compare(r, key, value, (a, b) => a < b)); return q; },
      range: (a: number, b: number) => { first = a; last = b; return q; },
      then: (resolve: (result: unknown) => unknown) => {
        const rows = table === "profiles" ? profiles : table === "leads" ? leads : [];
        return Promise.resolve(resolve({ data: rows.filter(r => filters.every(f => f(r))).slice(first, last + 1), error: null }));
      },
    };
    return q;
  });
  const code = ts.transpileModule(readFileSync("supabase/functions/bi-whatsapp-leads/index.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports: {}, require: () => ({ createClient: () => ({ from }) }), Deno: { env: { get: () => "fixture-key" }, serve: (fn: typeof handler) => { handler = fn; } }, Response });
  const call = (dates = { from: "2026-11-17", to: "2026-11-23" }) => handler(new Request("https://example.test", { method: "POST", headers: { "x-api-key": "fixture-key" }, body: JSON.stringify({ accounts: ["123"], date_basis: "contact_or_created", ...dates }) }));
  return { call, from };
}

describe("coorte paga do CRM enviada ao BI", () => {
  it("conta nove de doze criações quando três datas de contato estão fora, sem forçar o total", async () => {
    const rows = Array.from({ length: 12 }, (_, i) => lead(`lead-${i}`, { data_contato: i < 3 ? "2026-11-16" : "2026-11-20" }));
    const data = await (await endpoint(rows).call()).json();
    expect(data.accounts["123"].leads).toBe(9);
    expect(data).toMatchObject({ date_basis: "contact_or_created", period: { from: "2026-11-17", to: "2026-11-23" }, timezone: "America/Sao_Paulo" });
  });
  it("exclui indicação manual, orgânico, excluídos e outros clientes", async () => {
    const rows = [lead("paid"), lead("manual", { origem: "Indicação" }), lead("organic", { origem: "Orgânico" }), lead("deleted", { deleted_at: "2026-11-21T12:00:00Z" }), lead("another", { user_id: other })];
    expect((await (await endpoint(rows).call()).json()).accounts["123"].leads).toBe(1);
  });
  it("prioriza contato, usa criação somente se não há contato e conta cada ID uma vez", async () => {
    const rows = [lead("both", { data_contato: "2026-11-20" }), lead("creation-fallback"), lead("old-creation", { created_at: "2026-10-01T12:00:00Z", data_contato: "2026-11-20" }), lead("contact-outside", { data_contato: "2026-11-24" })];
    expect((await (await endpoint(rows).call()).json()).accounts["123"].leads).toBe(3);
  });
  it("respeita os limites de São Paulo e inclui toda a data final", async () => {
    const rows = [lead("before", { created_at: "2026-11-17T02:59:59Z" }), lead("start", { created_at: "2026-11-17T03:00:00Z" }), lead("end", { created_at: "2026-11-24T02:59:59.999999Z" }), lead("after", { created_at: "2026-11-24T03:00:00Z" }), lead("first-contact-day", { data_contato: "2026-11-17" }), lead("last-contact-day", { data_contato: "2026-11-23" })];
    expect((await (await endpoint(rows).call()).json()).accounts["123"].leads).toBe(4);
  });
  it("pagina os dois caminhos sem truncar a soma em mil", async () => {
    const rows = [...Array.from({ length: 1001 }, (_, i) => lead(`contact-${i}`, { data_contato: "2026-11-20" })), ...Array.from({ length: 6 }, (_, i) => lead(`fallback-${i}`))];
    expect((await (await endpoint(rows).call()).json()).accounts["123"].leads).toBe(1007);
  });
  it("sinaliza vínculo ambíguo sem somar empresas diferentes", async () => {
    const profiles = [{ user_id: owner, meta_ad_account_id: "act_123" }, { user_id: other, meta_ad_account_id: "123" }];
    const data = await (await endpoint([lead("a"), lead("b", { user_id: other })], profiles).call()).json();
    expect(data.accounts["123"]).toMatchObject({ mapping_ambiguous: true, leads: 0, client_url: null });
  });
  it("recusa datas inexistentes e intervalos invertidos antes de consultar a base", async () => {
    const app = endpoint([]);
    expect((await app.call({ from: "2026-02-30", to: "2026-03-01" })).status).toBe(400);
    expect((await app.call({ from: "2026-11-23", to: "2026-11-17" })).status).toBe(400);
    expect(app.from).not.toHaveBeenCalled();
  });
});
