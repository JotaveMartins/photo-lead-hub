## Problema

Em **Relatórios**, a métrica "Leads Criados" (e o passo "Leads" do funil) usa `created_at` (data em que o registro foi salvo no banco). Isso atrapalha cadastros retroativos: um lead do mês passado aparece no mês atual.

## Solução

Trocar o critério da métrica **"Leads Criados"** para usar o campo **Data do Contato** (`data_contato`) — preenchido pelo usuário no modal de Novo Lead e que representa quando o lead realmente entrou. Quando `data_contato` estiver vazio (leads antigos), cai de volta para `created_at` para não perder ninguém.

As demais métricas (Contato Iniciado, Proposta, Contrato, Ganho, Perdido) continuam exatamente como estão — já usam os campos `data_entrada_*` corretos.

## Alterações

**`src/pages/RelatoriosPage.tsx`**

1. No `leadSets.created`, trocar `inRange(l.created_at)` por `inRange(l.data_contato ?? l.created_at)`.
2. Nos mapas `handleFunnelClick` e `handleKpiClick`, atualizar a entrada de "Leads" / "Leads Criados":
   - `dateField: "data_contato"`
   - `dateLabel: "Data do Contato"`
3. No cálculo de `conversionTimes` (tempo Lead→Proposta / Lead→Ganho), usar `data_contato` como a primeira opção de "startTs", mantendo o fallback para `data_entrada_novo_lead` e `created_at`.

**`src/components/reports/ReportDrillDown.tsx`**

Sem mudança de lógica: o componente já aceita `dateField`/`dateLabel` via props e vai exibir "Data do Contato" automaticamente.

## Observações

- Tarefas (`periodTasks`) continuam usando `created_at` — é a data correta para tarefas, não há campo retroativo equivalente.
- Receita, ticket médio, e taxa de conversão usam os campos de fechamento (`data_entrada_fechado_ganho`), então não são afetados.
- O comportamento de "Leads Criados" passa a refletir **quando o lead entrou no pipeline** (do ponto de vista de negócio), e não quando o registro foi digitado no sistema.
