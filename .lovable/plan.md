

## Diagnóstico: Travamento ao Cadastrar Lead

### Análise

Revisei todo o fluxo de cadastro (`LeadModal`, `InteresseSelect`, `useCreateLead`, `useLeads`). Não há bugs que causem travamento. O código é funcional e direto.

**Causa mais provável**: falta de feedback visual durante o envio. O botão "Criar lead" não mostra loading -- se a internet do cliente for lenta, parece que travou. Ele pode clicar várias vezes, gerando múltiplas requisições simultâneas.

### Plano de Correção

Adicionar indicadores de loading e proteção contra cliques duplos nos formulários de lead:

1. **`LeadModal.tsx`** -- Desabilitar o botão de submit e mostrar spinner/texto "Criando..." enquanto a mutation estiver em andamento (`createLead.isPending` / `updateLead.isPending`)

2. **`RequiredFieldsModal.tsx`** -- Mesmo tratamento para o botão "Confirmar e mover"

3. **`InteresseSelect.tsx`** -- Mostrar "Carregando..." enquanto as opções estiverem sendo buscadas (`isLoading` do query)

4. **`KanbanBoard.tsx`** -- Desabilitar drag-and-drop durante mutations pendentes para evitar múltiplas movimentações

### Detalhes Técnicos

- Usar a prop `isPending` das mutations do TanStack Query para controlar o estado dos botões
- Adicionar `disabled={createLead.isPending || updateLead.isPending}` nos botões de submit
- Trocar o texto do botão para "Criando..." / "Salvando..." durante o loading
- No `InteresseSelect`, usar `isLoading` do `useInteresseOptions` para mostrar estado de carregamento

Alterações em 4 arquivos, sem mudanças no banco de dados.

