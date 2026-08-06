# Equipe como aba dentro da Agenda

## O que muda
- A página **Agenda** ganha duas abas no topo: **Agenda** e **Equipe**.
- O item **Equipe** sai do menu lateral (seção Clientes).
- Quem acessar `/equipe` é redirecionado para a Agenda já com a aba Equipe aberta.
- Toda a tela de Equipe atual (cards de resumo, tabela, criar/editar/remover profissional) continua igual, só passa a viver dentro da aba.

## Detalhes técnicos
- `src/pages/AgendaPage.tsx`: adicionar um alternador de abas (mesmo padrão visual já usado na página) controlado por query param `?tab=equipe`, renderizando o conteúdo atual ou o conteúdo de Equipe.
- Extrair o conteúdo de `src/pages/EquipePage.tsx` para um componente reutilizável (ex.: `src/components/equipe/EquipeSection.tsx`) sem o cabeçalho duplicado.
- `src/App.tsx`: rota `/equipe` passa a redirecionar para `/agenda?tab=equipe`.
- `src/components/Sidebar.tsx`: remover o item `equipe` de `clientesItems`.
- `src/components/DashboardLayout.tsx`: remover `equipe` do mapa de rotas/títulos ativos.
- Bump de versão em `src/lib/version.ts` para **3.2.8**.
