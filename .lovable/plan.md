## Objetivo

Resolver dois problemas no Inbox/conversa do lead:

1. A sincronização do histórico do WhatsApp falha com `Erro ao sincronizar: Edge function returned a non-2xx status code`.
2. Mensagens enviadas aparecem duplicadas visualmente no CRM, embora tenham sido enviadas uma única vez.

## Diagnóstico confirmado

- Na conta do Saulo, a conversa do telefone `5548999527087` existe, mas está com `instance_id` vazio.
- A função `sync-inbox-messages` hoje retorna erro HTTP quando a conversa não tem instância vinculada, causando o erro genérico no front.
- O Saulo tem uma única instância conectada, então a função pode vincular automaticamente essa conversa à instância correta.
- Para a duplicidade visual, o banco não mostrou duplicatas exatas nesse caso. O comportamento mais provável é uma corrida entre atualização otimista, insert real e realtime/refetch, ou mensagens com mesmo conteúdo/horário vindas de fontes diferentes. A correção deve deduplicar a lista exibida sem apagar dados.

## Plano de implementação

### 1. Corrigir a edge `sync-inbox-messages`

Em `supabase/functions/sync-inbox-messages/index.ts`:

- Quando a conversa não tiver `instance_id`, buscar instâncias conectadas do mesmo usuário.
- Se houver exatamente uma instância conectada:
  - usar essa instância para sincronizar;
  - salvar o `instance_id` na conversa para corrigir o vínculo permanentemente.
- Se não houver instância conectada, retornar resposta JSON amigável com `ok: false`, sem HTTP 400/500.
- Se houver mais de uma instância conectada e não der para inferir a correta, retornar `ok: false` com motivo claro.
- Evitar que erros esperados do modo conversa virem `non-2xx`; o front deve receber JSON tratável.

### 2. Melhorar o tratamento de erro no front

Em `src/components/LeadConversation.tsx` e `src/pages/InboxPage.tsx`:

- Após chamar `sync-inbox-messages`, verificar `data.ok === false`.
- Mostrar toast em português conforme o motivo:
  - sem instância conectada;
  - conversa sem instância e múltiplas instâncias disponíveis;
  - conversa não encontrada;
  - instância não encontrada.
- Manter o fluxo atual quando houver mensagens importadas.

### 3. Evitar duplicidade visual das mensagens

Em `src/components/LeadConversation.tsx` e `src/pages/InboxPage.tsx`:

- Criar um helper de deduplicação apenas para renderização da conversa.
- Prioridade de chave:
  1. `whatsapp_message_id`, quando existir;
  2. fallback por `direction + body + type + minuto/horário aproximado`, para capturar duplicidade visual de mensagens sem ID igual.
- Usar a lista deduplicada no `.map()` da UI, sem deletar registros do banco.
- Preservar ordenação cronológica.

### 4. Backfill pontual via migration

Criar migration para corrigir conversas antigas sem instância:

- Para usuários com exatamente uma instância conectada, preencher `inbox_conversations.instance_id` quando estiver vazio.
- Isso corrige imediatamente o caso do Saulo e outros casos equivalentes.

## Resultado esperado

- O botão de sincronizar histórico deixa de mostrar `Edge function returned a non-2xx status code` nesse caso.
- A conversa do Saulo com `5548999527087` passa a conseguir puxar o histórico usando a instância conectada.
- Mensagens duplicadas deixam de aparecer duplicadas visualmente no CRM.