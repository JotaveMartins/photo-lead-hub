

# Modulo de Relatorios V1 - Painel Completo

## Resumo

Reescrever completamente a pagina de Relatorios com um painel rico em indicadores, graficos e filtros. Admins verao dados de todos os clientes com filtro por cliente; usuarios normais verao apenas seus proprios dados.

---

## 1. Banco de Dados - Politicas de Acesso para Admin

Adicionar politicas RLS nas tabelas `leads` e `lead_tasks` para que admins possam ler dados de todos os usuarios:

- `leads`: nova politica SELECT "Admins can view all leads" usando `has_role(auth.uid(), 'admin')`
- `lead_tasks`: nova politica SELECT "Admins can view all lead_tasks" usando `has_role(auth.uid(), 'admin')`

Isso permite que o admin busque leads e tarefas de qualquer usuario sem precisar de edge function.

---

## 2. Hook de Dados - `useReportData`

Criar `src/hooks/useReportData.ts`:

- Se o usuario for admin, buscar leads de TODOS os usuarios (sem filtro de user_id)
- Se usuario normal, buscar apenas seus proprios leads (comportamento atual via RLS)
- Aceitar parametros de filtro: periodo (dateRange), origem, e userId (para filtro por cliente)
- Buscar tambem `lead_tasks` com os mesmos criterios
- Buscar lista de `profiles` (para admins, para popular o dropdown de clientes)

---

## 3. Barra de Filtros Globais

Componente `src/components/reports/ReportFilters.tsx`:

- **Filtro de Periodo**: Select com opcoes pre-definidas (Hoje, Ontem, Ultimos 7 dias, Ultimos 30 dias, Este mes, Mes anterior, Este ano, Intervalo personalizado)
  - Intervalo personalizado abre dois inputs de data (inicio/fim)
  - Padrao: "Este mes"
- **Filtro de Origem**: Select populado dinamicamente a partir das origens unicas nos leads. Quando nenhuma selecionada = todas
- **Filtro por Cliente** (apenas para admins): Select com lista de profiles/usuarios

---

## 4. Estrutura Visual do Painel

Reescrever `src/pages/RelatoriosPage.tsx` com os seguintes blocos organizados verticalmente:

### 4.1 Primeira Linha - KPIs (6 cards + 3 cards)

Cards principais baseados na data de entrada em cada etapa dentro do periodo:
- Leads criados (created_at no periodo)
- Contato iniciado (data_entrada_contato_iniciado no periodo)
- Propostas apresentadas (data_entrada_proposta_enviada no periodo)
- Contratos enviados (data_entrada_contrato_enviado no periodo)
- Ganhos (data_entrada_fechado_ganho no periodo)
- Perdidos (data_entrada_fechado_perdido no periodo)

Cards de receita:
- Receita total (soma dos `valor` dos Fechado Ganho no periodo)
- Ticket medio (receita / ganhos)
- Taxa de conversao geral (ganhos / leads criados)

### 4.2 Segunda Linha - Funil Visual

Componente `src/components/reports/FunnelChart.tsx`:
- Barras horizontais decrescentes representando: Leads -> Contato Iniciado -> Proposta -> Contrato Enviado -> Ganho
- Mostrar quantidade e percentual de conversao entre cada etapa
- Conversao final do funil (ganhos / leads)

### 4.3 Terceira Linha - Grafico por Dia

Componente `src/components/reports/DailyChart.tsx`:
- Grafico de colunas agrupadas (Recharts BarChart)
- 3 series: Leads criados, Propostas, Ganhos por dia
- Eixo X: dias do periodo, Eixo Y: quantidade

### 4.4 Quarta Linha - Receita

Componente `src/components/reports/RevenueSection.tsx`:
- Receita total no periodo
- Grafico de barras: receita por dia
- Ticket medio

### 4.5 Quinta Linha - Tempo de Conversao

Componente `src/components/reports/ConversionTimeSection.tsx`:
- Tempo medio Lead ate Proposta (diferenca entre data_entrada_novo_lead e data_entrada_proposta_enviada, em dias)
- Tempo medio Proposta ate Ganho (diferenca entre data_entrada_proposta_enviada e data_entrada_fechado_ganho, em dias)
- Exibido em cards simples com valor em dias

### 4.6 Sexta Linha - Perdas

Componente `src/components/reports/LossSection.tsx`:
- Total de negocios perdidos
- Grafico de barras horizontal por motivo_perda
- Percentual por motivo

### 4.7 Setima Linha - Tarefas/Produtividade

Componente `src/components/reports/TasksSection.tsx`:
- Cards: Total criadas, Concluidas, Pendentes, Atrasadas
- Separacao: Tarefas de contato (is_cadence=true) concluidas vs Follow-up concluidas
- Grafico: Tarefas concluidas por dia

---

## 5. Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Adicionar 2 politicas RLS para admin |
| `src/hooks/useReportData.ts` | Criar - hook centralizado de dados |
| `src/components/reports/ReportFilters.tsx` | Criar - barra de filtros |
| `src/components/reports/FunnelChart.tsx` | Criar - funil visual |
| `src/components/reports/DailyChart.tsx` | Criar - grafico diario |
| `src/components/reports/RevenueSection.tsx` | Criar - bloco receita |
| `src/components/reports/ConversionTimeSection.tsx` | Criar - tempos medios |
| `src/components/reports/LossSection.tsx` | Criar - perdas |
| `src/components/reports/TasksSection.tsx` | Criar - produtividade |
| `src/pages/RelatoriosPage.tsx` | Reescrever completamente |

---

## 6. Detalhes Tecnicos

- Todos os calculos de periodo usam os campos `data_entrada_*` (timestamps) e `created_at` das tabelas
- A filtragem e feita no frontend apos buscar os dados, ja que o volume por usuario e gerenciavel
- Para admins, a query nao filtra por user_id, permitindo ver todos os dados
- Graficos usando Recharts (ja instalado): BarChart, ResponsiveContainer, Tooltip, CartesianGrid
- Funil visual construido com divs estilizados com Tailwind (barras proporcionais)
- Todas as datas parseadas com `parseLocalDate` de `src/lib/utils.ts` para evitar bugs de timezone
- Formatacao monetaria com `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`

