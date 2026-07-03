# Meta Ads — correção de fuso e detalhamento por conjunto/anúncio

## 1. Corrigir divergência de valores (fuso horário)

**Causa provável:** o `sync-meta-ads` calcula `since`/`until` com `toISOString().slice(0,10)` (UTC), mas a conta Meta do Igor opera em `America/Sao_Paulo`. Entre 21:00 e 00:00 BR o "dia" UTC já virou, então o sync grava spend em um `date` diferente do que o gerenciador mostra. Ao longo de 30 dias essa diferença acumula ~5% (bate com os R$113).

**Correções em `supabase/functions/sync-meta-ads/index.ts`:**
- Buscar o `timezone_name` de cada `ad_account` (`GET /act_XXX?fields=timezone_name`).
- Calcular `since`/`until` na timezone da conta (usar `Intl.DateTimeFormat` com `timeZone`), não em UTC.
- Passar `time_range` + `use_account_attribution_setting=true` para o insights, garantindo alinhamento com o gerenciador.
- Aceitar `since`/`until` do body para permitir backfill manual.

**Backfill 90 dias:** invocar a função uma vez com `{ since: "<hoje-90d>", until: "<hoje>" }` para regravar `meta_daily_ads` com as datas corretas (o upsert por `date,ad_account_id,campaign_name,adset_name,ad_name` sobrescreve os valores antigos).

## 2. Botão "Ver detalhes" + Modal grande

Em `MetaAdsSection.tsx` adicionar botão no header. Ao clicar abre um `Dialog` largo (`max-w-6xl`, altura ~90vh, scroll interno) com:

**Cabeçalho do modal — KPIs expandidos:**
- Investimento, Conversas, Custo/conversa, Cliques, CTR, CPM, Alcance, Impressões, Leads CRM, Custo/lead, Custo/venda, Aproveitamento.
- Mini gráfico de linha do investimento e conversas por dia (recharts, tokens HSL do tema).

**Árvore expansível Campanha → Conjunto → Anúncio:**
- Cada linha mostra: nome, investimento, conversas, custo/conversa, cliques, CTR, impressões.
- Clicar na campanha expande os conjuntos daquela campanha (agregados a partir de `meta_daily_ads`).
- Clicar no conjunto expande os anúncios, e cada linha de anúncio mostra à esquerda o **thumbnail 64×64** do criativo com hover para 160×160.
- Ordenação padrão por investimento desc; toggle simples "por conversas".
- Filtro de texto no topo para buscar por nome.

## 3. Thumbnail do criativo

**Nova tabela `meta_ad_creatives`** (cache de thumbnails para não bater na API Meta a cada abertura do modal):
- `ad_id` (PK), `ad_account_id`, `client_id`, `thumbnail_url`, `permalink_url`, `creative_type` (image/video), `updated_at`.
- RLS: usuário lê linhas onde `client_id = auth.uid()`; admin lê tudo; service_role tudo.

**No `sync-meta-ads`:** após buscar insights, coletar `ad_id` únicos e chamar `GET /{ad_id}?fields=creative{thumbnail_url,image_url,effective_object_story_id,video_id}` em lote (batch API do Meta, 50 por request). Upsert em `meta_ad_creatives`. Thumbnails expiram — refazer a busca se `updated_at` > 24h.

**No modal:** hook novo `useMetaAdCreatives(adIds[])` que lê da tabela; se faltar algum, dispara `sync-meta-ads` com flag `refreshCreatives: true` para aquele `ad_account_id`.

## 4. Arquivos afetados

- `supabase/functions/sync-meta-ads/index.ts` — timezone da conta + fetch de criativos.
- `supabase/migrations/<novo>.sql` — cria `meta_ad_creatives` com GRANTs e RLS.
- `src/hooks/useMetaAdsReport.ts` — passar a incluir `adset_name`, `ad_name`, `adset_id`, `ad_id` no select.
- `src/hooks/useMetaAdCreatives.ts` — novo.
- `src/components/reports/MetaAdsSection.tsx` — botão "Ver detalhes".
- `src/components/reports/MetaAdsDetailsModal.tsx` — novo, com árvore e KPIs.
- `src/integrations/supabase/types.ts` — regenerado após migration.

## 5. Passos de execução

1. Migration da tabela `meta_ad_creatives`.
2. Editar `sync-meta-ads` (timezone + criativos).
3. Rodar backfill 90 dias.
4. Criar hooks e modal no frontend.
5. Adicionar botão em `MetaAdsSection`.

## Detalhes técnicos

- Timezone: `new Intl.DateTimeFormat("en-CA", { timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit" }).format(d)` → `YYYY-MM-DD` local da conta.
- Batch API Meta: `POST https://graph.facebook.com/v21.0/?batch=[...]&access_token=...`.
- Thumbnail cache TTL 24h (URLs assinadas do Meta expiram em ~alguns dias, seguro renovar diariamente no sync incremental).
