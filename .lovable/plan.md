Quatro ajustes pequenos, todos de UI:

## 1. Saudação no Início usa o nome da conta impersonada

Em `src/pages/InicioPage.tsx`, hoje o "Olá, {nome}" lê `user.user_metadata.nome` — que continua sendo o admin (João) mesmo dentro da conta do cliente.

- Usar `useEffectiveUserId()` para descobrir o usuário efetivo.
- Buscar o `nome` em `profiles` (via `useQuery` já usado no projeto) para esse ID e usar o primeiro nome.
- Fallback para o `user_metadata.nome` quando não houver perfil.

## 2. Remover "Anúncios" do menu inferior de admin

Em `src/components/Sidebar.tsx`, remover o item `anuncios` de `adminMenuItems` (mantém só "Clientes"). A rota `/anuncios` continua existindo, só não aparece na sidebar.

## 3. Faixa "Visualizando como…" fixa no topo

Em `src/components/DashboardLayout.tsx`:

- Tirar a faixa de dentro do `<main>` (onde hoje ela rola junto com a página).
- Renderizar como uma barra fina `fixed top-0 inset-x-0 z-[60]` acima de tudo, cobrindo a largura inteira da tela (inclusive por cima da sidebar no desktop).
- Quando `isImpersonating`, adicionar padding-top ao container raiz (e à top bar mobile) para não sobrepor conteúdo.
- Manter texto "Visualizando como {nome}" + botão "Sair".

## 4. Modo privacidade no admin (esconder nomes dos clientes)

Objetivo: numa reunião, o admin clica num ícone de olho e todos os nomes/e-mails de clientes viram um placeholder ("Cliente 1", "Cliente 2", …). Ao clicar de novo, volta ao normal.

Implementação:

- Novo hook `src/hooks/usePrivacyMode.ts` com estado booleano persistido em `localStorage` (`crm-privacy-mode`) e função `toggle()`. Emitir evento `storage`-like via `window.dispatchEvent` para sincronizar entre componentes na mesma aba.
- Em `src/pages/AdminPage.tsx`:
  - Botão `Eye` / `EyeOff` (lucide) no header ao lado do título.
  - Quando ativo, renderizar `nome` como `Cliente {index+1}` e ofuscar `email` como `••••••@•••` na tabela e no diálogo de exclusão.
  - No `handleImpersonate`, passar o nome mascarado quando o modo estiver ativo, para que a faixa "Visualizando como" também respeite o modo privacidade.
- O modo é puramente visual/admin — não altera dados no backend.

## 5. Versionamento

Bump `src/lib/version.ts` para **3.1.6** conforme regra do projeto.

## Arquivos alterados

- `src/pages/InicioPage.tsx`
- `src/components/Sidebar.tsx`
- `src/components/DashboardLayout.tsx`
- `src/pages/AdminPage.tsx`
- `src/hooks/usePrivacyMode.ts` (novo)
- `src/lib/version.ts`
