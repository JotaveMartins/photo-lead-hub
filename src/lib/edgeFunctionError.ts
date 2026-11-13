/** Supabase keeps a non-2xx function's JSON response inside error.context. */
export async function edgeFunctionError(error: unknown, fallback: string): Promise<Error> {
  const context = error && typeof error === "object" && "context" in error ? error.context : null;
  let detail: string | null = null;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") detail = body.error.trim();
      else if (typeof body?.message === "string") detail = body.message.trim();
    } catch { /* Proxy/network responses may contain no JSON. */ }
    if (context.status === 401 && (!detail || /invalid jwt|jwt expired|não autorizado/i.test(detail))) {
      return new Error("Sua sessão expirou ou não pôde ser validada. Entre novamente no CRM e tente outra vez.");
    }
  }
  if (detail) return new Error(detail);
  if (error instanceof Error && error.message && !/Edge Function returned a non-2xx status code/i.test(error.message)) {
    return new Error(error.message);
  }
  return new Error(`${fallback}${context instanceof Response ? ` (HTTP ${context.status})` : ""}. Se persistir, entre em contato com a equipe.`);
}
