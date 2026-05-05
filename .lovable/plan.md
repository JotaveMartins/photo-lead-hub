## Objetivo

Três mudanças grandes:

1. **Tarefas de Cliente** — hoje toda tarefa precisa estar atrelada a um lead. Permitir tarefa atrelada a **cliente**, com indicadores visuais e separação na tela de Tarefas.
2. **Equipe (freelancers)** — cadastrar profissionais (nome + telefone), selecioná-los nos eventos da agenda, e lançar despesa do tipo "Freelancer" vinculada ao profissional. **Contador de eventos por freela** na listagem de Equipe.
3. **Bolinhas/sininho de tarefas de cliente** na sidebar e na página de clientes.

---

## 1. Banco de dados (migrations)

**Nova tabela `team_members`** (equipe / freelancers do usuário)
- `id`, `user_id`, `nome`, `telefone`, `funcao` (texto livre opcional, ex: "2º fotógrafo", "filmmaker"), `ativo` bool, `deleted_at`, `created_at`, `updated_at`
- RLS: usuário gerencia os próprios; admin gerencia todos (mesmo padrão das outras tabelas)

**Nova tabela `event_team_members`** (N:N entre eventos e profissionais)
- `id`, `event_id`, `team_member_id`, `created_at`
- RLS via `EXISTS` em `events` (igual `package_services`)

**Coluna em `events`:** `responsavel_proprio` boolean default true — "vou eu mesmo".

**Alterações em `lead_tasks`:**
- `cliente_id uuid null`
- tornar `lead_id` **nullable**
- check constraint: exatamente um de `lead_id` ou `cliente_id` preenchido
- triggers existentes continuam usando `lead_id` — não afetam tarefas de cliente

**Alterações em `despesas`:**
- `team_member_id uuid null`
- "Freelancer" entra como categoria no front (coluna é `text`)

---

## 2. Hooks

- `src/hooks/useTeamMembers.ts` — CRUD + retorno enriquecido com `eventos_count` (via subquery contando linhas em `event_team_members` para o `team_member_id`, filtrando eventos com `deleted_at IS NULL`)
- `src/hooks/useEventTeamMembers.ts` — listar profissionais de um evento; substituir lista (delete + insert) ao salvar
- Atualizar `useLeadTasks.ts`:
  - `useCreateLeadTask` aceita `cliente_id` em vez de `lead_id`
  - Novo `useClienteTasks(clienteId)`
  - `useAllTasks` inclui `clientes(nome, whatsapp)` quando `cliente_id` presente
  - `useTodayClienteTasksCount()` para o badge da sidebar

---

## 3. UI — Equipe

**Nova rota `/equipe`** + item na Sidebar (ícone `HardHat`), entre "Clientes" e "Contratos".

Página `EquipePage.tsx`: cards no mobile / tabela no desktop com **nome, função, telefone, contador de eventos** (badge "N eventos"), ações editar/excluir. Modal "Novo Profissional" com 3 campos (nome*, telefone*, função opcional).

O contador de eventos vem do hook (`eventos_count`) e é clicável → abre drawer/popover listando os eventos daquele freela com data e cliente. (futuro: filtro por período).

**Integração na Agenda (`AgendaPage.tsx`)** — modal de evento ganha bloco "Equipe":
- Toggle "Sou eu que vou" (default ligado) → quando desligado, multi-select nativo de profissionais
- Atalho "Cadastrar novo profissional" abre o modal da página de Equipe
- Listagem do dia/tabela mostra nomes da equipe abaixo do local

**Integração nas Despesas (`NovaDespesaModal.tsx`)**:
- "Freelancer" em `CATEGORIAS`
- Quando categoria = "Freelancer", `<select>` nativo com profissionais; salva `team_member_id`
- Linha da despesa mostra nome do freela quando aplicável

---

## 4. UI — Tarefas de Cliente

**Modal "Nova Atividade" (`TarefasPage.tsx`)** — toggle "Lead" / "Cliente" no topo, alterna o select correspondente.

**Filtros na página de Tarefas** — chips "Tarefas de Lead" / "Tarefas de Cliente" (multi-toggle, ambos ligados por default). Tabela ganha badge "Tipo".

**Aba "Tarefas" na `ClienteDetailPage.tsx`** — lista das tarefas do cliente, botão "Nova tarefa" (cliente já pré-selecionado), concluir inline.

**Sidebar** — bolinha vermelha no item "Clientes" quando houver tarefa de cliente vencendo hoje.

**Sininho dentro de `ClientesPage.tsx`** — ícone de sino com contador, popover lista apenas tarefas de cliente para hoje, click vai ao detalhe.

---

## 5. Resumo de arquivos

| Arquivo | Ação |
|---|---|
| Migration SQL | `team_members`, `event_team_members`; alterar `lead_tasks` (cliente_id, lead_id nullable, check); `responsavel_proprio` em events; `team_member_id` em despesas |
| `src/hooks/useTeamMembers.ts` | Novo — CRUD + eventos_count |
| `src/hooks/useEventTeamMembers.ts` | Novo |
| `src/hooks/useLeadTasks.ts` | Suporte cliente_id; `useClienteTasks`, `useTodayClienteTasksCount` |
| `src/pages/EquipePage.tsx` | Nova página com contador |
| `src/components/equipe/TeamMemberModal.tsx` | Novo |
| `src/components/Sidebar.tsx` | Item "Equipe" + bolinha em "Clientes" |
| `src/App.tsx` | Rota `/equipe` |
| `src/pages/AgendaPage.tsx` | Bloco Equipe no modal e listagem |
| `src/components/financeiro/NovaDespesaModal.tsx` | Categoria Freelancer + select |
| `src/pages/TarefasPage.tsx` | Toggle Lead/Cliente, filtros, badge Tipo |
| `src/pages/ClientesPage.tsx` | Sininho de tarefas de cliente |
| `src/pages/ClienteDetailPage.tsx` | Aba "Tarefas" |

---

## Pontos a confirmar antes de implementar

1. **Despesa freelancer**: precisa **sempre** estar vinculada a um evento, ou pode ser solta?
2. **Equipe — campos**: só nome+telefone+função, ou já adicionar email e valor padrão por evento?
3. **Bolinha sidebar Clientes**: some quando tarefas do dia forem concluídas (mesma lógica do sininho), ok?
