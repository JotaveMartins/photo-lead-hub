# Integração com Google Agenda

Cada fotógrafo conecta a própria conta Google clicando em um botão. Quando um evento for criado no CRM, ele é criado automaticamente no Google Agenda dele.

## Como o fotógrafo conecta (UX final)

Em **Configurações** (ou no topo da página Agenda) adiciono um card "Google Agenda" com:
- Estado desconectado → botão **"Conectar Google Agenda"** que abre o popup do Google para login + autorização.
- Estado conectado → mostra o email da conta conectada e botão **"Desconectar"**.

A partir daí, toda criação de evento no CRM dispara automaticamente a criação no Google Agenda do fotógrafo. Sem ação extra dele.

## Sobre as credenciais Google (resposta à sua pergunta)

Para o fotógrafo só "logar com Google" e funcionar, **eu preciso de UM par de credenciais OAuth do Google Cloud configurado por você uma única vez**. Depois disso, qualquer fotógrafo conecta sozinho — eles não precisam mexer no Google Cloud.

Você cria isso uma vez no [Google Cloud Console](https://console.cloud.google.com):
1. Criar projeto (ou usar existente)
2. Ativar a **Google Calendar API**
3. Configurar **Tela de Consentimento OAuth** (External, com escopo `.../auth/calendar.events`)
4. Criar credencial **OAuth Client ID → Web Application**
5. Adicionar como redirect URI a URL do edge function de callback (eu te passo a URL exata depois de criar o function)
6. Copiar o **Client ID** e **Client Secret**

Eu te peço esses dois valores via formulário seguro de secrets quando chegar a hora.

> Observação: o conector nativo "Google Calendar" da Lovable não serve aqui — ele autentica só a sua conta, não a de cada fotógrafo. Por isso precisamos do OAuth próprio.

## Escopo confirmado

- Sincronização **uma via**: CRM → Google (criar, atualizar e deletar). Mudanças feitas direto no Google **não** voltam pro CRM.
- Eventos existentes ficam só no CRM. Só eventos **novos** (criados após conectar) vão para o Google.

## Detalhes técnicos

### Banco
Nova tabela `google_calendar_connections`:
- `user_id` (único), `google_email`, `access_token`, `refresh_token`, `token_expires_at`, `calendar_id` (default "primary"), timestamps.
- RLS: usuário só vê/edita a própria conexão. Tokens nunca são expostos ao frontend.

Coluna nova em `events`: `google_event_id` (text, nullable) para guardar o ID retornado pelo Google e permitir update/delete depois.

### Edge functions (3)
1. `google-calendar-auth-start` — gera URL de autorização Google com `state` assinado e devolve para o frontend abrir.
2. `google-calendar-auth-callback` — recebe o `code`, troca por tokens, salva em `google_calendar_connections`, fecha o popup.
3. `google-calendar-sync` — recebe `{ action: 'create'|'update'|'delete', event_id }`, lê o evento, faz refresh do token se expirado, chama a Google Calendar API. Retorna o `google_event_id`.

Secrets necessários: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (peço via add_secret quando chegar a hora).

### Frontend
- Componente `GoogleCalendarConnectionCard` em uma nova página `/configuracoes/integracoes` (ou aba na Agenda) — botão conectar/desconectar, mostra email conectado.
- `useEvents.ts` é alterado: após `create`/`update`/`delete` com sucesso, invoca o edge function `google-calendar-sync` em background. Se o usuário não tiver conexão Google, simplesmente pula. Falha de sync vira um toast discreto, **não bloqueia** a operação no CRM.

### Tratamento de erro
- Token expirado → refresh automático usando `refresh_token`.
- Refresh falhou (usuário revogou acesso) → marca conexão como inválida e mostra aviso "Reconecte sua conta Google".

## Etapas de implementação (quando você aprovar)

1. Migration: tabela `google_calendar_connections` + coluna `google_event_id`.
2. Peço os secrets `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` (você gera no Google Cloud).
3. Crio os 3 edge functions.
4. Crio o card de conexão e integro o sync no `useEvents`.
5. Te passo a redirect URI para você colar no Google Cloud Console.
