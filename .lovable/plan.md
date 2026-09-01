# Medição de uso do CRM por cliente (score de engajamento)

Objetivo: no fechamento de cada mês, o admin abre o painel e vê, por conta de cliente, o quanto ela usou o CRM, em quais áreas usou mais e em quais quase não usou — base para a bonificação do CS.

## Como o uso é medido

Sem nenhum tracking novo no app: o uso é calculado a partir dos registros que as próprias ações do cliente já geram no banco, contando apenas o que foi criado/alterado dentro do mês analisado.

Áreas medidas (cada uma vira um "pilar" do score):

| Pilar | O que conta |
|---|---|
| Leads | leads criados no mês |
| Pipeline | mudanças de etapa registradas no histórico do lead (ações manuais) |
| Tarefas | tarefas concluídas no mês |
| Inbox | mensagens enviadas pelo usuário (saídas, excluindo automáticas da IA) |
| Financeiro | cobranças e despesas criadas |
| Agenda | eventos criados |
| Clientes | clientes cadastrados |
| Entregas | entregas criadas ou movidas de etapa |
| Contratos | contratos criados |
| Estúdio IA | projetos e carrosséis criados |
| Acesso | último acesso registrado e se houve acesso dentro do mês |

## Score

- Cada pilar recebe uma nota de 0 a 100 comparando a conta com as demais contas ativas no mesmo mês (posição relativa), e o score geral é a média ponderada dos pilares.
- Peso maior para os pilares que representam o uso central do CRM (Leads, Pipeline, Tarefas, Inbox); peso menor para os complementares.
- Sem rótulos "Ativo / Em risco". O foco é o número e a leitura por pilar.
- Para cada conta, destaque de "onde mais mexeu" (top 3 pilares) e "onde menos mexeu" (pilares com uso zero ou quase zero) — exatamente o que o CS usa para direcionar a conversa.
- Comparação com o mês anterior: variação do score e de cada pilar (setinha de alta/baixa).

## Onde aparece (painel de Admin)

1. **Nova aba "Uso"** ao lado de Clientes e Configurações:
   - Seletor de mês (padrão: mês anterior fechado).
   - Ranking das contas por score, com colunas dos números brutos por pilar e a variação vs. mês anterior.
   - Exportação em CSV para fechar a bonificação.
2. **Coluna "Uso" na lista de Clientes** já existente: score do mês anterior por conta.
3. **Detalhe por conta**: ao clicar na linha, painel lateral com as barras por pilar (mais usado → menos usado), números absolutos, evolução dos últimos 6 meses e último acesso.

Contas de administrador (dados de demonstração) ficam fora do ranking, seguindo o mesmo critério já usado nos Relatórios.

## Detalhes técnicos

- Uma função de banco `admin_usage_metrics(month_start date)` com privilégio elevado, restrita a quem tem papel de admin, retornando uma linha por `user_id` com as contagens de cada pilar no mês. Faz as agregações direto no Postgres (uma passada por tabela), evitando puxar as linhas para o cliente e contornando o RLS por usuário.
- Uma segunda chamada da mesma função para o mês anterior alimenta a comparação.
- Novo hook `useUsageMetrics(monthStart)` (React Query) chamando a função via RPC, mais um utilitário `src/lib/usageScore.ts` com os pesos, a normalização por percentil e o cálculo do score.
- Novos componentes: `src/components/admin/UsageTab.tsx` (ranking + seletor de mês + CSV) e `src/components/admin/UsageDetailDrawer.tsx` (pilares por conta). `AdminPage.tsx` ganha a aba e a coluna de score.
- Sem alteração de schema: nenhuma tabela nova, apenas a função de leitura agregada.
- Bump de versão em `src/lib/version.ts`.
