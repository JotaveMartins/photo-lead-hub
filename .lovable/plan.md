## Problema

O item "Inbox" no menu lateral leva para `/leads` em vez de `/inbox`. A rota `/inbox` e a página existem, mas o `handleItemClick` em `src/components/DashboardLayout.tsx` não tem o mapeamento `inbox: "/inbox"`, então cai no fallback `/leads`. Por isso parece "não conseguir acessar".

## Correção

**`src/components/DashboardLayout.tsx`**
1. Em `handleItemClick`, adicionar entrada `inbox: "/inbox"` no objeto `routes`.
2. Em `getActiveItem`, adicionar `if (path === "/inbox") return "inbox";` para que o item fique destacado quando ativo.

Mudança pequena, apenas 2 linhas. Nenhum outro arquivo precisa de alteração — a rota em `App.tsx` e o item no `Sidebar.tsx` já estão corretos.