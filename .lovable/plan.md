## Objetivo

Garantir que mensagens recebidas no WhatsApp sempre apareçam no CRM, mesmo quando o webhook do Evolution falhar (instância momentaneamente desconectada, evento perdido, etc.). Para isso usamos duas camadas: um **botão de recarregar** sob demanda e um **cron job a cada 15 minutos** como rede de segurança.

## Como vai funcionar

1. Edge function `sync-inbox-messages` consulta o endpoint `POST /chat/findMessages/{instancia}` da Evolution API, que devolve o histórico de mensagens armazenado na instância.
2. Para cada mensagem retornada, compara o `whatsapp_message_id` com o que já existe em `inbox_messages`. Se já existe, ignora. Se não, insere usando a mesma lógica do webhook (matching por número/LID, vínculo com lead, criação de conversa se necessário).
3. Nunca duplica mensagem nem cria conversa duplicada — sempre reaproveita conversa existente (mesma regra de `whatsappMatchKey` que já usamos).

## Camada 1 — Botão "Recarregar conversa" (sob demanda)

- Botão pequeno no header da aba **Conversa do Lead** (`LeadConversation.tsx`) e no header do chat do **Inbox** (`InboxPage.tsx`).
- Ao clicar, chama `sync-inbox-messages` passando `conversation_id` e o limite (ex.: últimas 50 mensagens daquele contato).
- Mostra spinner enquanto roda e um toast com quantas mensagens novas foram importadas.

## Camada 2 — Cron job automático a cada 15 minutos

- Habilita extensões `pg_cron` e `pg_net` no banco.
- Cria um job que dispara `sync-inbox-messages` a cada 15 minutos, em modo "todas as instâncias conectadas".
- Nesse modo, a função:
  - Lista todas as `whatsapp_instances` com `status = 'connected'`.
  - Para cada instância, busca as mensagens das últimas 2 horas (janela de segurança contra perdas) via `findMessages` com filtro `timestamp >= now - 2h`.
  - Roda o mesmo pipeline de deduplicação/inserção.
- Janela de 2h cobre eventos perdidos sem reprocessar histórico antigo. Como a deduplicação é por `whatsapp_message_id`, reprocessar é seguro (idempotente).

## Detalhes técnicos

### Nova edge function `sync-inbox-messages`

Aceita dois modos de chamada:

```text
modo "conversation"  →  body: { conversation_id: "..." }
                        usa o instance_id e contact_number/jid da conversa
                        importa últimas 50 mensagens desse contato

modo "all_instances" →  body: { mode: "all_instances", since_minutes: 120 }
                        usado pelo cron
                        para cada instância conectada, busca mensagens
                        com timestamp >= now - since_minutes
```

Para cada mensagem nova:
- Reaproveita a mesma lógica de matching e criação de conversa do `evolution-webhook` (extrair em helper ou duplicar). Inclui:
  - Detecção de JID (`@s.whatsapp.net` vs `@lid`)
  - Busca por `whatsappMatchKey` para reaproveitar conversa
  - Vínculo automático com lead existente pelo número
- Insere em `inbox_messages` com `whatsapp_message_id` para evitar duplicata em rodadas futuras.
- Adiciona índice único parcial em `inbox_messages(whatsapp_message_id)` (onde não nulo) se ainda não existir, como proteção extra contra duplicatas.

### Refatoração

Extrair a lógica de "salvar mensagem inbound a partir do payload Evolution" do `evolution-webhook/index.ts` para uma função compartilhada que ambos (webhook e sync) usam. Isso garante que webhook e sync produzem o mesmo resultado.

### UI

`LeadConversation.tsx` e `InboxPage.tsx`:
- Botão ícone "Recarregar" (`RefreshCw` do lucide) no header do chat.
- Estado de loading local, chamada via `supabase.functions.invoke('sync-inbox-messages', { body: { conversation_id } })`.
- Toast com resultado: `"X novas mensagens importadas"` ou `"Nenhuma mensagem nova"`.
- Após sucesso, invalida `["inbox_messages", conversationId]`.

### Cron job

SQL via supabase insert (não migration, contém URL e anon key específicos do projeto):

```sql
select cron.schedule(
  'sync-inbox-messages-15min',
  '*/15 * * * *',
  $$ select net.http_post(
    url := '<project>.functions/v1/sync-inbox-messages',
    headers := '{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
    body := '{"mode":"all_instances","since_minutes":120}'::jsonb
  ); $$
);
```

### Config

- `supabase/config.toml`: adicionar `[functions.sync-inbox-messages] verify_jwt = false` (cron chama sem JWT de usuário; a função usa `SERVICE_ROLE_KEY` internamente).

## Resultado esperado

- Mensagens perdidas pelo webhook aparecem automaticamente em até 15 minutos.
- Você pode forçar a sincronização imediata clicando no botão dentro do lead ou do inbox.
- Zero duplicatas: mensagens já existentes (`whatsapp_message_id` já no banco) são ignoradas.
- Conversas e leads continuam vinculados pelo mesmo `whatsappMatchKey` — nada quebra do que já funciona.
