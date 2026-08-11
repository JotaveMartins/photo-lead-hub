# Corrigir leads/conversas com LID no lugar do número

## O problema (confirmado no banco)
Várias conversas do inbox têm `contact_number`, `contact_name` e `contact_jid` preenchidos com o **LID** do WhatsApp (ex.: `144654582448187@lid`), e não com o telefone. Isso acontece quando o WhatsApp entrega a mensagem só com a identidade `@lid` (privacidade de número) e nunca envia o JID de telefone. Como o CRM usa `contact_number` para preencher o modal "Criar lead", o lead nasce com o LID no nome e no telefone.

Hoje 15+ conversas estão nessa situação (algumas já viraram lead, ex.: o lead do print).

## O que vamos fazer

### 1. Resolver o número real via WhatsApp (Evolution)
Nova função de backend `resolve-lid-contacts` que, para cada conversa marcada por LID:
- consulta os contatos/chats da instância conectada procurando o registro daquele LID;
- se o retorno trouxer o JID de telefone (`...@s.whatsapp.net`) e/ou o nome do contato, atualiza a conversa: `contact_number` = telefone, `contact_jid` = JID real, `contact_name` = nome (só se hoje o nome for o próprio LID);
- se a conversa já estiver ligada a um lead, atualiza também `whatsapp` e `nome` do lead;
- se duas conversas do mesmo contato existirem (uma por LID e outra pelo telefone), mantém a mais recente e não cria duplicidade.

Primeiro passo da implementação é validar, com a instância do Saulo, se a API realmente devolve o telefone para esses LIDs. Se não devolver, seguimos só com os itens 2 e 3 e aviso você.

### 2. Botão para rodar a correção
Em Configurações → WhatsApp, botão "Atualizar contatos" (visível para admin) que dispara a função e mostra quantas conversas foram corrigidas. Também rodo uma vez agora, na mão, para limpar o histórico existente.

### 3. Evitar que aconteça de novo no modal de criar lead
No inbox, quando o contato ainda estiver identificado apenas por LID:
- o modal "Criar lead" tenta resolver o número na hora; se conseguir, preenche normalmente;
- se não conseguir, os campos Nome e WhatsApp vêm **em branco** (com aviso "número ainda não identificado pelo WhatsApp — preencha manualmente") em vez de colar o LID;
- na lista do inbox, conversas só com LID mostram "Contato sem número identificado" no lugar do número gigante.

Além disso, o número real continua sendo preenchido automaticamente assim que o contato responder e o WhatsApp entregar o JID de telefone (esse backfill já existe).

## Detalhes técnicos
- Nova edge function `supabase/functions/resolve-lid-contacts/index.ts`, usando `base_url`/`api_key` de `whatsapp_instances` (mesmo padrão de `sync-inbox-messages`), endpoints `chat/findContacts` e `chat/findChats`.
- Seleção dos alvos: conversas onde `contact_number = contact_lid` ou `contact_jid` termina em `@lid`.
- Alterações no frontend: `src/pages/InboxPage.tsx` (prefill e exibição), `src/pages/WhatsAppConfigPage.tsx` (botão).
- Sem mudanças de schema. Versão sobe para 3.4.1.
