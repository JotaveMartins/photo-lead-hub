

## Plano: Unificar "Parcelas" e "Recorrente" em apenas duas opções

### O que muda
Remover a opção "Cobrança recorrente" do dropdown e do modal, mantendo apenas **"Cobrança única"** e **"Criar parcelas"**.

### Alterações

**1. `src/pages/FinanceiroPage.tsx`**
- Remover `"recorrente"` do tipo `ModalType` (fica `"unica" | "parcelas"`)
- Remover o terceiro botão do dropdown ("Cobrança recorrente")

**2. `src/components/financeiro/NovaCobrancaModal.tsx`**
- Remover `"recorrente"` do tipo `ModalType`
- Remover estados `frequencia` e `quantidade`
- Remover todo o bloco condicional `{type === "recorrente" && ...}` (linhas 238-302)
- Remover a função `previewDates()`
- Remover entradas de `titles`/`subtitles` para `"recorrente"`
- Remover o branch `else` do `handleSubmit` que trata recorrente (linhas 106-133)
- Ajustar texto do botão de submit (remover condição de recorrente)

Nenhuma alteração no banco de dados é necessária — o enum `cobranca_tipo` pode manter o valor `recorrente` sem impacto.

