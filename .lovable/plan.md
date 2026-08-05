# Corrigir valores do Meta Ads em Relatórios → Tráfego Pago

## O que está acontecendo (confirmado nos dados)

O problema **não é fuso horário** — é duplicação de linhas no banco.

A tabela de métricas do Meta usa como chave única a combinação **data + conta + nome da campanha + nome do conjunto + nome do anúncio**. Ou seja, a identificação é feita pelo **nome**, não pelo ID.

Quando alguém renomeia um conjunto ou anúncio no gerenciador (o que acontece com frequência), a próxima sincronização não reconhece que é o mesmo item: cria uma **linha nova** em vez de atualizar a existente. O mesmo dia passa a ter o gasto contado duas vezes.

Exemplo real encontrado na conta do print (julho/2026):

```text
06/07 - anúncio "AD02 - CERIMONIA & RECEPÇÃO 01" (mesmo ad_id)
  linha 1: conjunto "11 - [IOS] [IG] [NOIVAS 24-44] ..."    R$ 24,27
  linha 2: conjunto "11 - [TODOS] [IG] [NOIVAS 24-44] ..."  R$ 24,27  <- duplicata após renomear
```

Total de julho no CRM: **R$ 2.164,15** (o valor do print). Removendo as duplicatas, cai para a faixa de R$ 1.800 que você viu no gerenciador. Cliques e conversas também estão inflados pelo mesmo motivo.

Segundo ponto: existem registros antigos dessa conta **sem cliente vinculado** (`client_id` vazio). Como o relatório do cliente filtra por cliente, esses dias simplesmente somem quando você entra pela conta dele — por isso os números "não alinham" entre a visão admin e a visão do cliente.

## O que será feito

1. **Trocar a chave de identificação para IDs do Meta** (data + conta + ID do anúncio), que nunca mudam quando algo é renomeado. Nome de campanha/conjunto/anúncio passa a ser apenas informação exibida, sempre atualizada com o valor mais recente.
2. **Limpar as duplicatas já existentes**: para cada dia/anúncio repetido, manter apenas o registro mais recente e apagar os demais. Isso corrige o histórico de todas as contas de uma vez.
3. **Vincular registros órfãos ao cliente correto**, preenchendo o cliente a partir da conta de anúncios sempre que estiver vazio (e manter isso na sincronização).
4. **Alinhar as regras de filtro dos relatórios**:
   - Admin sem cliente selecionado: soma de todas as contas.
   - Admin com cliente selecionado: dados daquele cliente.
   - Visualizando como cliente / conta do próprio cliente: dados daquela conta.
   O filtro passa a considerar tanto o cliente vinculado quanto a conta de anúncios do perfil, evitando buracos.
5. **Ressincronizar o período recente** após a correção, para conferir que os totais batem com o gerenciador de anúncios.

## Detalhes técnicos

- Migração: substituir o índice `meta_daily_ads_unique` (por nomes) por um índice único em `(date, ad_account_id, ad_id)`; antes disso, deletar duplicatas mantendo `max(updated_at)` por essa chave; `UPDATE` de backfill do `client_id` via `profiles.meta_ad_account_id`.
- `supabase/functions/sync-meta-ads/index.ts`: chave de dedupe em memória passa de nomes para `ad_id`; `onConflict` do upsert atualizado para a nova chave; fallback para linhas sem `ad_id`.
- `src/hooks/useMetaAdsReport.ts`: filtro por `client_id` **ou** `ad_account_id` do perfil alvo (busca o `meta_ad_account_id` do perfil), mantendo "todas as contas" quando admin sem seleção.
- Verificação: consulta comparando o total de julho da conta `act_1111...` antes/depois e confronto com o valor do gerenciador.
