

## Correção: Select do Radix travando dentro de Dialogs

### Causa raiz
O componente `SelectContent` (em `src/components/ui/select.tsx`, linha 65) usa `SelectPrimitive.Portal` para renderizar o dropdown **fora** do DOM do Dialog. O focus trap do Dialog detecta que o foco saiu e puxa de volta, criando o loop infinito que trava o Chrome. O texto concatenado ("Selecione a origemInstagram") é o render glitchado desse loop.

### Correção (1 arquivo)

**`src/components/ui/select.tsx`** (linha 65):
- Remover o wrapper `SelectPrimitive.Portal` do `SelectContent`
- Sem o Portal, o conteúdo do Select fica dentro do DOM do Dialog, e o focus trap não detecta que o foco "saiu" — eliminando o conflito

Essa é a correção recomendada pela própria documentação do Radix para o uso de Select dentro de Dialog. Afeta todos os Selects do sistema de uma vez, incluindo Origem, Status, e qualquer outro Select usado dentro de modais.

### Impacto
- Corrige o travamento do campo Origem no LeadModal
- Corrige preventivamente qualquer outro Select dentro de Dialog/Sheet no sistema
- Zero mudança visual — o dropdown continua aparecendo no mesmo lugar graças ao `position="popper"`

