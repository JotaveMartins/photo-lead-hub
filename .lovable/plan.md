## Correções no relatório com período "Máximo"

### 1. Gráfico de Receita "bugado" no Máximo
O eixo X formata datas como `"dd/MM"` sem ano. No "Máximo" (anos de histórico), os mesmos `dd/MM` se repetem e o gráfico vira centenas de barras com rótulos duplicados.

**Correção em `src/pages/RelatoriosPage.tsx` (`revenueDailyData`):** escolher granularidade conforme o tamanho do intervalo:
- ≤ 60 dias → por **dia**, label `dd/MM`
- ≤ 730 dias → por **mês**, label `MM/yy`
- > 730 dias → por **ano**, label `yyyy`

### 2. Tempo "Lead → Venda"
A fórmula já é a que você descreveu — `data_entrada_fechado_ganho − data_entrada_novo_lead`, tirando a média sobre os leads ganhos no período. Não há bug; os 7 dias refletem a base demo (leads ganham logo após serem criados).

**Pequena melhoria de robustez:** quando `data_entrada_novo_lead` for `null` (leads antigos, anteriores ao trigger), usar `created_at` como fallback. Isso evita ignorar leads válidos e deixa a média mais representativa em períodos longos.

### Arquivos alterados
- `src/pages/RelatoriosPage.tsx`
