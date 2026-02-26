

## Diagnóstico completo: Travamento no cadastro de lead (Chrome)

### Causa raiz confirmada

O `DatePickerField` usa um **Popover (Radix)** dentro de um **Dialog (Radix)**. O Popover renderiza seu conteudo via Portal **fora** do DOM do Dialog. Quando o Popover abre, o **focus trap do Dialog** detecta que o foco saiu e puxa de volta. Isso cria um **loop infinito de foco** que congela o navegador. No Chrome isso é mais agressivo que em outros browsers.

O `pointer-events-auto` resolve cliques, mas **não resolve o conflito de focus trap**.

Além disso, existem **4 outros `<Input type="date">` nativos** dentro de modais que mantêm o mesmo problema original:
- `FollowUpModal.tsx` (linha 78) -- `<Input type="date">` dentro de Dialog
- `LeadDetailDrawer.tsx` (linhas 171, 685) -- `<Input type="date">` dentro de Sheet (edição de tarefas)
- `LeadDetailDrawer.tsx` (linhas 612-622) -- InlineField com `type="date"` dentro de Sheet
- `TarefasPage.tsx` (linha 263) -- verificar contexto

### Plano de correção (4 arquivos)

1. **`src/components/DatePickerField.tsx`** -- Adicionar `onOpenAutoFocus={(e) => e.preventDefault()}` e `onCloseAutoFocus={(e) => e.preventDefault()}` no `PopoverContent`. Isso impede o Popover de lutar com o Dialog pelo foco. Também adicionar `modal={true}` no Popover para que ele gerencie seu próprio focus trap independente do Dialog.

2. **`src/components/FollowUpModal.tsx`** -- Substituir `<Input type="date">` (linha 78) por `DatePickerField` para eliminar o conflito com o Dialog.

3. **`src/components/LeadDetailDrawer.tsx`** -- Substituir os `<Input type="date">` nas linhas 171 e 685 (edição de tarefas) por `DatePickerField`. Para os `InlineField` com `type="date"` (linhas 612-622), mudar para usar DatePickerField inline ou manter o input nativo apenas fora de modais (Sheet é menos agressivo, mas melhor prevenir).

4. **`src/components/LeadModal.tsx`** -- Adicionar tratamento de erro genérico no catch (o catch atual só trata ZodError, qualquer erro de rede/banco é silenciado e parece travamento).

### Detalhe técnico do fix principal

```text
PopoverContent
  ├─ onOpenAutoFocus={e => e.preventDefault()}   ← impede roubo de foco
  ├─ onCloseAutoFocus={e => e.preventDefault()}  ← impede loop ao fechar
  └─ className="w-auto p-0 pointer-events-auto"
```

Total: 4 arquivos modificados. Sem mudanças no banco.

