# Investigação — conversa da Vitória (554792426261)

Olhei o banco e o código. Encontrei duas causas distintas:

## 1) Mensagem aparece duplicada

Na conversa só existem 2 linhas em `inbox_messages`, ambas com o mesmo texto e timestamp ~17:02:33:

- Linha A → `whatsapp_message_id = 3EB097…2082` (gravada pelo **webhook** quando a Evolution ecoou de volta a mensagem enviada).
- Linha B → `whatsapp_message_id = NULL` (gravada pelo **cliente** em `useInbox.ts`, logo depois do `send-whatsapp-message`).

Ou seja: toda mensagem que o Saulo envia pelo CRM cai duas vezes — uma do client (sem id) e outra do webhook (com id). Hoje não há nenhuma deduplicação.

## 2) Emoji enviado pelo Saulo não aparece

Não tem registro nenhum desse evento — nem em `inbox_messages`, nem em `webhook_logs`. E descobri o motivo de não termos histórico de webhook: a inserção em `webhook_logs` está enviando uma coluna `user_id` que **não existe na tabela**, então toda gravação falha silenciosamente há semanas. Sem log bruto, não dá pra dizer se a Evolution sequer entregou o emoji ou se ele caiu em algum branch que ainda não tratamos.

---

# Plano

## A. Eliminar a duplicação de outbound

1. **`src/hooks/useInbox.ts` (`useSendInboxMessage`)**: depois do `send-whatsapp-message`, ler `data.result.key.id` (a Evolution devolve) e gravar no insert do `inbox_messages` como `whatsapp_message_id`. Se a função não devolver id, mantém `null`.
2. **Migration**: criar `UNIQUE INDEX inbox_messages_wid_unique ON inbox_messages (whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL`. Antes de criar o índice, limpar duplicatas históricas mantendo a linha com `whatsapp_message_id` preenchido.
3. **`supabase/functions/evolution-webhook/index.ts`** (passo "4. Save message to inbox_messages"): trocar o `insert` puro por uma rotina idempotente para outbound (`key.fromMe = true`):
   - Se já existe linha com aquele `whatsapp_message_id` → não faz nada.
   - Senão, procura na mesma `conversation_id` uma linha outbound dos últimos 60s com `body` igual e `whatsapp_message_id IS NULL` → faz `UPDATE` preenchendo o `whatsapp_message_id` (e mídia, se houver) em vez de inserir.
   - Senão, insere normalmente.
   
   Inbound (`fromMe = false`) continua igual, mas também ganha o "skip se whatsapp_message_id já existe" pra ser à prova de re-entrega.

## B. Voltar a ter log bruto da Evolution

4. **Migration**: adicionar coluna `user_id uuid` em `webhook_logs` (nullable, sem FK rígida, só pra debug). Com isso o `insert` do webhook volta a funcionar e a gente passa a ter os payloads recentes pra inspecionar.
5. Sem mudanças no comportamento da edge function aqui — só corrigir o efeito colateral.

## C. Diagnóstico do emoji do Saulo (depois que B estiver em produção)

6. Pedir pro Saulo reenviar o emoji. Eu consulto `webhook_logs` (filtrando por `554792426261` no payload) e confirmo se:
   - a Evolution está entregando o evento, e
   - em qual wrapper o emoji chega (`conversation`, `extendedTextMessage`, `editedMessage`, algo novo).
7. Se for um wrapper que o webhook ainda não trata (ex.: `editedMessage`, `protocolMessage` com edição), adiciono o branch correspondente em `evolution-webhook` e em `sync-inbox-messages`. Esse passo fica como follow-up após coletar o log — não dá pra cegar agora porque não temos evidência do formato exato.

## Fora de escopo

- Mexer em mensagens de reação / efêmeras (já tratadas na rodada anterior).
- Mudar a UX de envio (botão, modal, feedback).
- Backfill manual de mensagens passadas — só passa a deduplicar daqui pra frente.
