interface AccessClient {
  rpc(name: "has_active_crm_access", args: { p_user_id: string }): PromiseLike<{ data: unknown; error: unknown }>;
}

export async function inactiveCrmResponse(client: AccessClient, userId: string, headers: Record<string, string>) {
  const { data, error } = await client.rpc("has_active_crm_access", { p_user_id: userId });
  if (!error && data === true) return null;
  return new Response(JSON.stringify({
    error: error ? "Não foi possível verificar o acesso ao CRM. Tente novamente." : "Seu período de acesso ao CRM terminou ou a conta está bloqueada. Fale com a equipe para continuar.",
    code: error ? "CRM_ACCESS_UNAVAILABLE" : "CRM_ACCESS_REQUIRED",
  }), { status: error ? 503 : 403, headers: { ...headers, "Content-Type": "application/json" } });
}
