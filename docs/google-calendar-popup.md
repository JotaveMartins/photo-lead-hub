# Conclusão OAuth do Google Agenda no CRM

## Causa observada

A consulta GET sem parâmetros ao callback publicado retornou HTTP 200 com
`Content-Type: text/plain`. O código retornava HTML com JavaScript, que por isso
era exibido como texto e não notificava a janela principal nem fechava o pop-up.

## Correção

O callback mantém a troca de código, a URI registrada e a persistência da conexão.
Depois de salvar, responde com redirecionamento HTTP 303 para
`/oauth/google-calendar/callback` no domínio do CRM que veio no state assinado.
Origens inválidas ou state não verificável usam o domínio público de produção.
A URL final contém somente resultado e código de erro, sem e-mail ou tokens.

A nova rota pública do frontend mostra o resultado usando o design do CRM,
notifica o opener da mesma origem e fecha o pop-up após sucesso quando possível.
Há botões de fechar e voltar às Integrações quando o navegador não permite o
fechamento ou não mantém o opener. Falhas permanecem legíveis na janela.
A janela principal aceita mensagens somente do pop-up aberto e da própria origem.
Fechar o pop-up sem concluir não dispara mais um aviso falso de sucesso.

## Implantação

Publicar o frontend atualizado, que precisa conter a nova rota, e então publicar
somente a Edge Function `google-calendar-auth-callback`. As duas partes precisam
estar atualizadas no domínio usado no fluxo OAuth. Para testar pela prévia, ela
também precisa conter a nova rota.

Não trocar a URI de redirecionamento no Google Cloud Console. Ela continua sendo
`/functions/v1/google-calendar-auth-callback` no backend; a rota nova é apenas a
conclusão dentro do frontend. Os scopes e `include_granted_scopes` não foram
alterados. Não há migração de banco nem necessidade de desconectar contas que
já estão funcionando.

## Verificação

Os testes executam os handlers reais com Google e Supabase simulados: gravação,
redirecionamento, state inválido/expirado, recusa do Google e ausência de dados
sensíveis na URL. A suíte verifica ainda notificação e fechamento do pop-up,
origem/source das mensagens, fechamento manual sem aviso falso e preservação
dos scopes/URI atuais. O consentimento real com Google deve ser validado depois
da publicação da função e do frontend.
