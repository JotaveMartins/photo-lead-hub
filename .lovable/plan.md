
## Objetivo

Quando chegar uma mensagem de WhatsApp de um número que já corresponde a um lead no CRM, a conversa (e todo o histórico futuro) deve aparecer dentro daquele lead. E quando você criar/editar um lead no CRM com um número que já tem conversa órfã no inbox, essa conversa também deve ser vinculada.

## Causa raiz dos furos atuais

O webhook (`evolution-webhook/index.ts`, linhas 446–462) já tenta vincular, mas:

1. O matching usa `endsWith` cru. Se o lead foi salvo como `(61) 9314-6687` (10 dígitos, sem DDI) e a Evolution manda `5561993146687` (13 dígitos), o `endsWith` casa por sorte; mas também pode dar falso positivo entre dois números diferentes que terminam igual.
2. A vinculação só roda no momento que a mensagem chega. Se o lead é criado *depois* da conversa, ou se o número do lead é editado depois, a conversa antiga continua órfã para sempre.

## Mudanças

### 1. Chave de match canônica — últimos 11 dígitos

Em `src/lib/utils.ts`, adicionar helper:

```ts
// Últimos 11 dígitos (DDD + 9 + número) ou 10 (DDD sem o 9). Usado
// só para comparar dois números entre si — não para enviar à Evolution.
export function whatsappMatchKey(raw: string | null | undefined): string
```

Regra: tira tudo que não é dígito, remove um `55` inicial se houver, e retorna os **últimos 11 dígitos** (ou todos, se forem menos). Comparação passa a ser igualdade estrita dessa chave. Dois números diferentes não casam mais; um lead `61993146687` casa com Evolution `5561993146687` e vice-versa.

### 2. Webhook: usar a mesma chave

Em `supabase/functions/evolution-webhook/index.ts`:

- Replicar o helper `whatsappMatchKey` no topo do arquivo (edge functions não compartilham `src/lib`).
- No bloco "SEMPRE tenta vincular a conversa a um lead já existente" (linhas 446–462), trocar o `.find(... endsWith ...)` por igualdade da chave canônica.
- **Também aplicar o mesmo match quando a conversa já tem `lead_id`?** Não — se já está vinculada a alguém, mantém. Só preencho `lead_id` quando está vazio.

### 3. Religar conversas órfãs ao criar/editar lead no CRM

Adicionar trigger no banco (migração com prefixo `zzz_` conforme convenção do projeto) na tabela `leads`:

- Disparo: `AFTER INSERT OR UPDATE OF whatsapp ON public.leads`.
- Ação: calcular a chave canônica do `NEW.whatsapp` em SQL (regex `regexp_replace` para tirar não-dígitos, remover `55` prefixo, pegar últimos 11 dígitos). Fazer `UPDATE public.inbox_conversations SET lead_id = NEW.id WHERE user_id = NEW.user_id AND lead_id IS NULL AND <mesma chave aplicada a contact_number>`.
- Cobre os dois casos: lead novo encontra conversa antiga; edição de número troca a vinculação.
- Função `public.zzz_link_inbox_conversations_to_lead()` em `SECURITY DEFINER` (precisa atualizar `inbox_conversations` de qualquer user), `SET search_path = public`.

Trigger nomeado `zzz_link_inbox_after_lead_change` para respeitar a ordem documentada na memória.

### 4. Fora de escopo

- Não mexer no `LeadConversation.tsx` (já procura conversa por número quando o lead abre — segue funcionando, e passa a achar mais coisas porque o `lead_id` já estará preenchido pelo trigger).
- Não tocar em `send-whatsapp-message`.
- Não alterar criação automática de lead por palavra-chave; ela continua só rodando quando não há lead vinculado, e agora o match é mais confiável.
- Sem migração de dados retroativa nesta etapa — leads existentes só ganham conversas religadas se forem editados ou se uma nova mensagem chegar. (Posso adicionar um one-shot backfill depois, se quiser.)

## Riscos

- **Falso positivo zero entre números diferentes** (passa a exigir igualdade dos últimos 11 dígitos).
- **Falso negativo possível** se o lead foi cadastrado sem o 9º dígito de celular: `6193146687` (10 dígitos) **não** vai casar com `5561993146687` (chave `61993146687`). Você escolheu esse comportamento mais restrito; nesses casos é só editar o lead para incluir o 9 e o trigger religa.
