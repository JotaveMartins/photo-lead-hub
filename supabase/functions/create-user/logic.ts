/** Pure helpers for the admin create-user function (tested in src/test/adminCreateUser.test.ts). */
export const normalizeEmail = (raw: unknown) => (typeof raw === "string" ? raw.trim().toLowerCase() : "");

export const isDuplicateEmailError = (error: { code?: string; message?: string; status?: number } | null | undefined) =>
  !!error && (error.code === "email_exists" || error.code === "user_already_exists" || /already (been )?registered|already exists/i.test(error.message ?? ""));

const formatDate = (iso: string) => {
  const [y, m, d] = new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).split("-");
  return `${d}/${m}/${y}`;
};

/** Message shown to the admin when the e-mail already has an account; never offers to recreate it. */
export function duplicateAccountMessage(existing?: { nome?: string | null; created_at?: string | null; inTrial?: boolean } | null) {
  if (!existing?.nome) return "Já existe uma conta com este e-mail. Procure o cliente na lista de contas em vez de criá-lo de novo.";
  const when = existing.created_at ? `, criada em ${formatDate(existing.created_at)}` : "";
  const where = existing.inTrial ? ' Ela está em "Testes grátis".' : "";
  return `Já existe uma conta com este e-mail: ${existing.nome}${when}.${where} Procure o cliente na lista em vez de criá-lo de novo.`;
}
