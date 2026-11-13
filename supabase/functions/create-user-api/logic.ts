/** Pure helpers for create-user-api (tested in src/test/createUserApi.test.ts). */

/**
 * Accounts created through the HTTP API (sales automation) are paying customers,
 * not public sign-ups: they get the regular customer access with no expiry
 * instead of the 60-day free trial the sign-up trigger assigns.
 */
export const API_CLIENT_ACCESS = {
  mode: "legacy",
  trial_started_at: null,
  trial_ends_at: null,
  valid_until: null,
  plan: null,
} as const;

interface AccessDb {
  from(table: string): any;
}

/** Moves the freshly created account out of the free trial and records why. */
export async function grantApiClientAccess(db: AccessDb, userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: previous } = await db.from("crm_account_access").select("*").eq("user_id", userId).maybeSingle();
  const row = { user_id: userId, ...API_CLIENT_ACCESS, updated_at: new Date().toISOString() };
  const { data: updated, error } = await db.from("crm_account_access").upsert(row, { onConflict: "user_id" }).select("*").maybeSingle();
  if (error) return { ok: false, message: error.message ?? "falha ao liberar acesso" };
  await db.from("crm_access_audit").insert({
    user_id: userId,
    actor_id: null,
    action: "api_create_client",
    previous_access: previous ?? null,
    new_access: updated ?? row,
    note: "Conta criada pela API (requisição HTTP): cliente ativo, sem teste grátis.",
  });
  return { ok: true };
}
