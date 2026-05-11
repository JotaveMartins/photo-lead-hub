## Melhorias no filtro de período + filtro de Interesse (Relatórios)

### 1. Adicionar opção "Máximo" no Período
`src/components/reports/ReportFilters.tsx`:
- Adicionar `"all"` ao tipo `PeriodOption` e em `periodLabels` como **"Máximo"**.
- Em `getDateRange`, retornar `start = new Date(2000, 0, 1)` e `end = tomorrow`, cobrindo todo o histórico.

### 2. Texto bugado no intervalo personalizado
Os botões de Início/Fim usam `w-[150px]`, e "Selecione a data" + ícone não cabem.
- Aumentar para `w-[170px]` (ou `min-w-[170px]`).

### 3. Calendário abre sempre no mês atual
`src/components/DatePickerField.tsx`:
- Passar `defaultMonth={selected}` para `<Calendar>`, fazendo o calendário abrir no mês da data já selecionada.

### 4. Adicionar filtro "Interesse" em Relatórios
- Em `RelatoriosPage.tsx`, derivar a lista `interesses` de forma análoga a `origens` (a partir dos leads carregados — que já respeitam o `clienteUserId` selecionado quando admin).
- Adicionar estado `interesse` e passá-lo a `useReportData` (acrescentar `interesse` aos params do hook e aplicar `.eq("interesse", interesse)` na query de leads).
- Em `ReportFilters.tsx`, adicionar um `<select>` nativo "Interesse" no mesmo padrão visual de "Origem", com opção "Todos" e a lista recebida via props.
- O filtro reflete automaticamente os interesses da conta selecionada porque `leads` já vêm filtrados por `clienteUserId`.

### Arquivos alterados
- `src/components/reports/ReportFilters.tsx`
- `src/components/DatePickerField.tsx`
- `src/pages/RelatoriosPage.tsx`
- `src/hooks/useReportData.ts`
