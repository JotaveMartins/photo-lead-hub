## Problema

- `/anuncios` filtra por `ad_account_id` e mostra **R$ 1.042** (correto).
- `/relatorios` filtra por `client_id` e mostra **~R$ 200**.
- Causa: a edge function `sync-meta-ads`, quando recebe `ad_account_id` no body, grava `client_id = NULL`. O backfill manual feito ontem sobrescreveu várias linhas de maio do Igor com `client_id = NULL`, então o relatório (que filtra por `client_id`) não as enxerga.

## Mudanças

### 1. Edge function `sync-meta-ads`
Mesmo quando `ad_account_id` é passado no body, resolver o `client_id` consultando `profiles.meta_ad_account_id` antes de inserir. Assim qualquer caminho de sincronização (manual, botão da página, cron diário) sempre grava o vínculo correto.

Lógica:
- Manter aceitar `ad_account_id` no body.
- Antes do loop, fazer `SELECT user_id FROM profiles WHERE meta_ad_account_id IN (variantes com/sem prefixo act_)` e montar o array `accounts` já com `client_id` preenchido (cai para `null` só se realmente não houver perfil ligado).

### 2. Backfill de correção
Rodar o sync novamente sem `ad_account_id` (modo "todos os perfis") para o período de maio. Isso reescreve as linhas com `client_id` correto. Como o índice único é `(date, ad_account_id, campaign_name, adset_name, ad_name)`, o `upsert` substitui as linhas existentes — sem duplicar.

### 3. Verificação
Após o backfill, conferir que `SUM(spend)` por `client_id = <Igor>` no mês bate com o total do `/anuncios` para a conta dele.

## Não muda
- Frontend de `/relatorios` e `/anuncios` permanecem como estão.
- Cron diário já configurado ontem continua funcionando (ele já roda sem `ad_account_id`).
- Estrutura de tabelas, RLS, índices: nenhuma alteração.

## Detalhes técnicos
Arquivos:
- `supabase/functions/sync-meta-ads/index.ts` — adicionar resolução de `client_id` via `profiles` mesmo quando `ad_account_id` vier no body.

Após deploy, invocar `sync-meta-ads` com `{ since: "2026-05-01", until: "<hoje>" }` (sem `ad_account_id`) para reescrever maio do Igor com `client_id` correto.
