# Diagnóstico

## O que aconteceu na conta do Igor Serra

No dia **28/06 às 16:34**, o lead da **Clara Gurgel** teve o whatsapp editado por engano para a letra `"c"` (provavelmente um Ctrl+A + digitação acidental). Ficou assim até **18:58**, quando foi corrigido de volta para `558581041201`.

Nesse intervalo de ~2h30, **3 conversas do inbox** foram criadas no inbox (Aurinha, 🙌🏽, e uma com JID `53506...`) e, quando o sistema tentou "criar lead" a partir delas, **todas foram vinculadas ao lead da Clara Gurgel** em vez de criarem leads novos. Por isso, ao clicar "Ver lead" na Aurinha, abre a Clara.

## Causa raiz (bug de código)

Em `src/hooks/useLeads.ts`, dentro de `useCreateLead`, o dedup por whatsapp tem duas falhas graves:

```ts
const existingLead = existingLeads.find((item) => {
  const current = normalizeWhatsApp(item.whatsapp); // remove tudo que não é dígito
  return current === normalizedWhatsapp
      || current.endsWith(normalizedWhatsapp)       // ← problema
      || normalizedWhatsapp.endsWith(current);      // ← problema
});
```

1. Quando o whatsapp do lead novo é vazio (ou inválido como `"c"` → vira `""`), `"" === ""` é true e qualquer lead com whatsapp inválido bate.
2. `string.endsWith("")` é **sempre `true`** em JS — então mesmo com números válidos, qualquer string termina em string vazia. Basta um dos lados ser vazio para retornar o primeiro lead da lista.

Combinando: enquanto a Clara estava com `whatsapp = "c"` (normaliza para `""`), qualquer nova conversa criada no inbox que disparasse "criar lead" caía na Clara, e o `InboxPage` em seguida fazia `update inbox_conversations.lead_id = clara.id`.

Esse mesmo bug também explica o sintoma de **"leads novos não aparecem no pipeline"**: se o usuário cria um lead com whatsapp vazio/inválido (ou só com máscara), o `useCreateLead` **não insere nada** — retorna um lead existente silenciosamente, e o usuário acha que sumiu.

# Plano de correção

## 1. Corrigir o dedup do `useCreateLead`

Em `src/hooks/useLeads.ts`:

- Só rodar a busca de duplicata se `normalizedWhatsapp` tiver **pelo menos 8 dígitos** (limite seguro para evitar match por sufixo curto).
- Trocar a comparação por uma chave canônica: usar `whatsappMatchKey` (já existe em `src/lib/...`) ou aplicar uma lógica equivalente local, comparando **chaves iguais**, sem `endsWith`.
- Garantir que ao criar um lead com whatsapp vazio o sistema **insere** normalmente em vez de devolver um lead existente.

## 2. Validar whatsapp no update do lead

Em `useUpdateLead` (mesmo arquivo) e no `LeadModal` / `LeadDetailDrawer`:

- Normalizar e validar antes de salvar: se o usuário digitou algo sem dígitos suficientes (< 8), bloquear o save com toast de erro em vez de gravar `"c"` no banco.

## 3. Data-fix da conta do Igor

Via migration (idempotente, escopada ao `user_id` do Igor `f363dacf-450e-40e2-aeec-c43653f94095`):

- Desvincular as 3 conversas mal-ligadas à Clara Gurgel:
  - `f7640d5b-...` (Aurinha)
  - `1d8a7639-...` (`53506...`)
  - `1ec3cac0-...` (🙌🏽 `558586688976`)
- Setar `lead_id = NULL` nelas, para que voltem a aparecer "soltas" no inbox e o Igor possa criar/vincular o lead correto manualmente.
- Varredura preventiva: procurar, na conta dele, qualquer outra conversa cujo `whatsapp_match_key(contact_number)` **não bate** com o `whatsapp_match_key(leads.whatsapp)` do lead vinculado, e listar (sem alterar) para revisão.

## 4. Validação

- Após o fix, abrir a Aurinha no inbox e confirmar que "Ver lead" não cai mais na Clara.
- Criar um lead com whatsapp vazio e confirmar que ele aparece no pipeline em "Novo Lead".
- Tentar editar o whatsapp de um lead para `"c"` e confirmar que o sistema bloqueia.

# Fora do escopo

- Não vou alterar o histórico (`lead_history`) — fica como auditoria do que aconteceu.
- Não vou tentar "adivinhar" para qual lead cada conversa órfã deveria ir; isso fica para o Igor decidir no inbox.
