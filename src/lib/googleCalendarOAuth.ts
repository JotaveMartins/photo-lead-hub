export const googleCalendarErrorMessage = (reason: unknown) => {
  const messages: Record<string, string> = {
    denied: "A autorização foi cancelada ou recusada no Google. Você pode tentar conectar novamente.",
    invalid_state: "A conexão expirou ou não pôde ser validada. Volte às Integrações e tente novamente.",
    missing_parameters: "Não foi possível concluir o retorno do Google. Volte às Integrações e tente novamente.",
    token_exchange_failed: "Não foi possível concluir a autorização com o Google. Tente conectar novamente.",
    missing_refresh_token: "O Google não enviou a autorização para manter a conexão. Tente novamente; se persistir, remova o acesso do CRM na sua Conta Google antes de reconectar.",
    profile_unavailable: "Não foi possível identificar a conta Google autorizada. Tente conectar novamente.",
    save_failed: "Não foi possível salvar a conexão. Tente conectar novamente.",
  };
  return typeof reason === "string" && Object.prototype.hasOwnProperty.call(messages, reason)
    ? messages[reason]
    : "Não foi possível conectar o Google Agenda. Volte às Integrações e tente novamente.";
};
