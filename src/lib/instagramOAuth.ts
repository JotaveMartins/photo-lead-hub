export const instagramErrorMessage = (reason: unknown) => {
  const messages: Record<string, string> = {
    denied: "A autorização foi cancelada ou recusada no Instagram. Você pode tentar conectar novamente.",
    invalid_state: "A conexão expirou ou não pôde ser validada. Volte às Integrações e tente novamente.",
    missing_parameters: "Não foi possível concluir o retorno do Instagram. Volte às Integrações e tente novamente.",
    token_exchange_failed: "Não foi possível concluir a autorização com o Instagram. Tente conectar novamente.",
    profile_unavailable: "Não foi possível ler o perfil do Instagram autorizado. Tente conectar novamente.",
    save_failed: "Não foi possível salvar a conexão. Tente conectar novamente.",
  };
  return typeof reason === "string" && Object.prototype.hasOwnProperty.call(messages, reason)
    ? messages[reason]
    : "Não foi possível conectar o Instagram. Volte às Integrações e tente novamente.";
};
