

## Causa raiz: `<input type="date">` dentro de Dialog Radix

O problema é um **conflito conhecido** entre o date picker nativo do navegador (`<input type="date">`) e o **focus trap** do Radix Dialog. Quando o usuário clica no campo de data, o navegador tenta abrir o calendário nativo, mas o Dialog captura o foco de volta, criando um loop que trava a interface. Isso varia por navegador e sistema operacional — por isso funciona para alguns e não para outros.

### Solução

Substituir todos os `<Input type="date">` dentro de modais por **Datepickers customizados** usando Calendar + Popover do Shadcn, que são compatíveis com o Dialog Radix.

### Arquivos alterados

1. **`src/components/LeadModal.tsx`** — Substituir os 3 campos `<Input type="date">` (Data do Evento, Data do Contato, Data da Proposta) por componentes Popover + Calendar
2. **`src/components/RequiredFieldsModal.tsx`** — Substituir os 2 campos `<Input type="date">` (Data da Proposta, Data do Evento) por Popover + Calendar
3. **`src/components/ui/calendar.tsx`** — Adicionar `pointer-events-auto` na className do DayPicker para garantir interatividade dentro de dialogs

### Detalhes técnicos

- Criar um componente auxiliar `DatePickerField` reutilizável que encapsula Popover + PopoverTrigger (Button) + PopoverContent (Calendar)
- Recebe `value: string` (YYYY-MM-DD), `onChange: (value: string) => void`, e `label`
- Usa `format(date, "dd/MM/yyyy")` para exibição amigável em pt-BR
- Usa `parseLocalDate()` já existente em `lib/utils.ts` para evitar shift de timezone
- Calendar com `className="p-3 pointer-events-auto"` para funcionar dentro do Dialog
- Total: 3 arquivos modificados, 1 componente novo opcional

