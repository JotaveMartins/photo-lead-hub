

## Análise completa: inputs nativos restantes que podem causar travamento

### Problema encontrado

Ainda existem **5 `<input type="date">` nativos** no sistema que NÃO foram convertidos para o `DatePickerField` customizado:

1. **`src/components/LeadDetailDrawer.tsx`** (linhas 614, 618, 622) — 3 campos `InlineField` com `type="date"` para Data do Evento, Data do Contato e Data da Proposta. Esses ficam dentro de um `Sheet` (Radix), que também tem focus trap. Quando o cliente clica para editar a data no drawer do lead, o input nativo entra em conflito.

2. **`src/components/reports/ReportFilters.tsx`** (linhas 109, 113) — 2 campos `<Input type="date">` para filtro de período customizado nos relatórios. Esses estão fora de modal, então o risco é menor, mas para consistência devem ser convertidos também.

### Por que o travamento é intermitente

O componente `InlineField` no drawer funciona assim: o usuário clica no texto → o campo muda para `<input>` com `autoFocus` via `useEffect`. Se o `type="date"` for renderizado, o Chrome pode abrir o date picker nativo automaticamente ao receber foco, criando o conflito com o focus trap do Sheet. Isso explica por que às vezes funciona (se o usuário não toca nos campos de data do drawer) e às vezes trava.

### Plano de correção

**Arquivo 1: `src/components/LeadDetailDrawer.tsx`**
- Converter os 3 `InlineField` com `type="date"` (linhas 614-624) para usar `DatePickerField` diretamente, sem o padrão click-to-edit do `InlineField` (que renderiza `<input type="date">`)
- Cada campo passará a exibir o `DatePickerField` permanentemente em vez de alternar entre texto e input

**Arquivo 2: `src/components/reports/ReportFilters.tsx`**
- Converter os 2 `<Input type="date">` (linhas 109, 113) para usar `DatePickerField`
- Ajuste menor pois estão fora de modal, mas mantém consistência

Total: 2 arquivos modificados, 0 novos.

