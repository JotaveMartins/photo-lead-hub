# Revisão geral da interface mobile

O app já é responsivo (sidebar drawer, top bar mobile, modais com `max-h-[90vh]`), mas várias páginas e componentes ainda foram pensados primariamente em desktop. Como o escopo é "app inteiro", proponho atacar em **4 fases**, da mais visível para a menos. Cada fase pode ser aprovada/implementada de forma independente — assim você vê o resultado antes de seguir.

Trabalho apenas em frontend/presentation, mantendo o tema escuro, tokens HSL e padrões já definidos (sem portals, native `<select>`, etc.).

---

## Fase 1 — Fundamentos (chrome do app)

Toca todas as páginas, baixo risco, alto impacto.

1. **Top bar mobile** (`DashboardLayout.tsx`): adicionar título da página no centro (vindo da rota ativa) e um botão "+" rápido contextual quando aplicável (Novo Lead, Nova Despesa…). Hoje só tem o menu hamburger e o logo.
2. **Sidebar mobile** (`Sidebar.tsx`): aumentar tap targets, melhorar espaçamento dos badges, fechar com swipe (drag horizontal) além do backdrop, e garantir scroll interno fluido em telas baixas.
3. **Cabeçalhos de página** (`LeadsPage`, `DashboardHeader`, demais páginas): hoje muitos usam `flex-col sm:flex-row` mas empilham ações em 2 linhas no mobile. Padronizar:
   - Título + contagem em 1 linha compacta
   - Ações secundárias (lixeira, notificações) em ícones agrupados
   - Botão primário (ex: Novo Lead) full-width abaixo, ou flutuante
4. **Espaçamento global** (`<main>` em `DashboardLayout`): `p-4` no mobile está apertado para cards densos. Ajustar para `px-3 py-4` e revisar margens dos cabeçalhos (`mb-8` → `mb-4` no mobile).

## Fase 2 — Listagens e tabelas

A maioria das tabelas (`LeadsTableDB`, `ClienteTable`, `CobrancaTable`, despesas, contratos, equipe, pacotes, serviços, agenda) força scroll horizontal no mobile.

- Converter cada tabela para **renderizar como lista de cards no mobile** (já existe padrão em `ClienteCards` e `CobrancaCards`). Aplicar o mesmo padrão nas que faltam.
- No Kanban (`KanbanBoard.tsx`): no mobile, transformar as colunas de status num **carrossel horizontal snap** com indicador de coluna ativa e altura controlada, em vez de scroll vertical de página + scroll horizontal de board.
- Filtros (origem, busca, intervalo de datas): empilhar verticalmente e usar um `Sheet` "Filtros" acionável por botão único quando houver mais de 2 filtros.

## Fase 3 — Modais e formulários

Padronizar todos os modais para mobile (referência: `NovaDespesaModal` que já está em `max-w-2xl`).

- Modais grandes (NovaCobrancaModal, EditCobrancaModal, LeadModal, EditClienteModal, NovoClienteModal, PackageModal, ServiceModal, ContratoInfoModal, TeamMemberModal, RequiredFieldsModal, FollowUpModal, LossReasonModal, CreateUserModal): garantir `w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90dvh] overflow-y-auto`, grids `grid-cols-1 sm:grid-cols-2`, e rodapé com botões empilhados full-width no mobile.
- `LeadDetailDrawer`: no mobile usar 100% da largura (atualmente 60%), e mover tabs internas para um sticky header dentro do drawer.
- Date/Time pickers (`DatePickerField`, `TimePickerField`): conferir se abrem bem no mobile (popover não cortado pela viewport).

## Fase 4 — Páginas específicas com layouts próprios

- **Dashboard / FinanceiroResumoPage / RelatoriosPage**: cards de stats em grid `grid-cols-2` no mobile (hoje muitos usam 4 colunas que ficam minúsculas). Gráficos (`recharts`) com altura reduzida e tooltip touch-friendly.
- **InboxPage / MensagensPage / LeadConversation**: garantir conversação em tela cheia no mobile com header sticky e input fixo no rodapé (acima do teclado). Lista de conversas vira tela separada com "voltar".
- **AgendaPage**: hoje é provavelmente uma grade — adicionar uma view "agenda lista" como padrão no mobile.
- **AdminPage / IAPage / IntegracoesPage / WhatsAppConfigPage**: revisão de cards e formulários (geralmente menos críticos, mas finalizam a passada).

---

## Detalhes técnicos

- Sem mudanças de regra de negócio nem de banco; só CSS, layout e pequenos ajustes de componentes.
- Continuo usando tokens (`bg-card`, `text-foreground`, `--border`, etc.). Nada de cor hardcoded.
- Mantenho native `<select>` e proibição de portais conforme as regras de UI já existentes.
- Uso `useIsMobile` (já existe em `src/hooks/use-mobile.tsx`) quando precisar de lógica condicional além do que Tailwind resolve.
- Tap targets mínimos 44×44 nos pontos de toque primários.
- QA visual em cada fase pelo preview no viewport atual (390×843).

---

## Como prosseguir

Sugiro começarmos pela **Fase 1** (chrome do app) — é o que mais muda a sensação geral e serve de base para as outras. Você aprova, eu implemento, vemos o resultado, e seguimos para a Fase 2.

Se preferir uma ordem diferente (ex: começar por modais porque te incomodam mais), é só me dizer.