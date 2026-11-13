import { describe, expect, it } from "vitest";
import { API_CLIENT_ACCESS, grantApiClientAccess } from "../../supabase/functions/create-user-api/logic";

function fakeDb(existing: Record<string, unknown>) {
  const writes: Record<string, unknown[]> = { upsert: [], audit: [] };
  const db = {
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: chain._upserted ?? existing, error: null }),
        upsert: (row: unknown) => { writes.upsert.push(row); chain._upserted = row; return chain; },
        insert: async (row: unknown) => { if (table === "crm_access_audit") writes.audit.push(row); return { error: null }; },
      };
      return chain;
    },
  };
  return { db, writes };
}

describe("create-user-api access", () => {
  it("accounts created by the HTTP request become customers, not free trials", async () => {
    const { db, writes } = fakeDb({ user_id: "u1", mode: "trial", trial_ends_at: "2027-01-11T00:00:00Z" });
    expect(await grantApiClientAccess(db, "u1")).toEqual({ ok: true });
    expect(writes.upsert[0]).toMatchObject({ user_id: "u1", mode: "legacy", trial_started_at: null, trial_ends_at: null });
    expect(API_CLIENT_ACCESS.mode).not.toBe("trial");
  });
  it("records the change in the access audit", async () => {
    const { db, writes } = fakeDb({ user_id: "u1", mode: "trial" });
    await grantApiClientAccess(db, "u1");
    expect(writes.audit[0]).toMatchObject({ user_id: "u1", action: "api_create_client", previous_access: { mode: "trial" } });
  });
});
