# ROAS por cliente e ROAS Mediano da Carteira

Adicionar o indicador de retorno sobre investimento em tráfego pago na seção Meta Ads de Relatórios: por cliente quando um cliente está selecionado, e a mediana da carteira no modo consolidado.

## Fórmula

Para cada cliente, no período filtrado:

```text
ROAS = Receita de leads GANHOS com origem "Tráfego Pago" / Investimento em Meta Ads
```

Regras aplicadas:
- Só entram clientes com investimento em tráfego no período (investimento > 0).
- Receita conta apenas leads marcados como Ganhos no CRM, com origem Tráfego Pago, dentro do período.
- Investimento sem venda registrada = ROAS 0 (entra no cálculo).
- Cliente sem investimento no período fica fora.
- Cliente em implantação (conta criada há menos de 30 dias) fica fora.
- Carteira usa a MEDIANA dos ROAS individuais, nunca média.

## O que muda na tela

### 1. Cliente selecionado (ou conta do próprio cliente)
Novo card "ROAS (Tráfego Pago)" na seção Meta Ads, ao lado de Custo por lead / Custo por venda, mostrando o valor no formato `4,2x` com dica explicando a fórmula. Quando não há investimento no período, mostra "—".

### 2. Consolidado (admin sem cliente selecionado)
Novo bloco dentro da seção Meta Ads:
- Card destacado "ROAS Mediano da Carteira" com o valor (ex.: `7,0x`) e a contagem de clientes elegíveis.
- Tabela compacta e recolhível "ROAS por cliente" listando: cliente, investimento, receita de tráfego pago, ROAS, ordenada do maior para o menor ROAS.
- Nota indicando quantos clientes foram excluídos por estarem em implantação ou sem investimento.

Tudo recalcula automaticamente quando os dados de investimento ou de vendas mudam, seguindo o mesmo período/filtros já existentes na página.

## Detalhes técnicos

- Sem alteração de banco. Cálculo derivado dos dados já carregados.
- `src/hooks/useReportData.ts`: incluir `created_at` e `meta_ad_account_id` no select de `profiles` (usados para implantação e para mapear conta de anúncio → cliente).
- Novo `src/hooks/usePortfolioRoas.ts`: recebe as linhas do Meta Ads (`useMetaAdsReport`), os leads do período e os profiles; agrupa investimento por cliente resolvendo `client_id` e, quando nulo, `ad_account_id` via `profiles.meta_ad_account_id` (normalizando o prefixo `act_`); agrupa receita ganha de tráfego pago por `lead.user_id`; aplica os filtros de elegibilidade e retorna a lista por cliente + mediana.
- `src/components/reports/MetaAdsSection.tsx`: novo card de ROAS individual e o bloco consolidado (visível apenas quando admin está sem cliente selecionado). Reaproveita `Hint`, formatação BRL e o padrão visual atual dos cards.
- `src/pages/RelatoriosPage.tsx`: passar para a seção os leads ganhos do período (com `user_id`, `valor`, `origem`) e os profiles, além do que já é passado hoje.
- Contas de administrador continuam excluídas do consolidado (comportamento atual de `useAdminAccounts`).
- Bump de versão em `src/lib/version.ts` para 3.6.4.
