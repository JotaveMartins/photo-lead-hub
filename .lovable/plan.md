# Plano — 3 melhorias na tela de Leads

## 1. Fixar notas no topo do histórico (Atividades)
Arquivo: `src/components/LeadDetailDrawer.tsx` (linhas ~920-952, montagem do `items` da timeline).

- Mudar a montagem do array: separar `noteItems` (do tipo `note`) dos demais (`otherItems`).
- Ordenar cada grupo por data desc independentemente.
- Renderizar `[...noteItems, ...otherItems]` para que **todas** as notas apareçam no topo, acima de tarefas/mudanças/histórico, mantendo entre si a ordem por data (mais recente primeiro).
- Nenhuma mudança de banco. As notas continuam vindo de `lead_notes`.

## 2. Edição em massa de campo (ex.: origem) em vários leads
Adicionar seleção múltipla + barra de ação em massa.

**Visualização Tabela** (`src/components/LeadsTableDB.tsx`):
- Adicionar coluna de checkbox por linha + checkbox "selecionar todos" no header.
- Estado `selectedIds: Set<string>` no componente.
- Quando houver seleção, mostrar uma barra flutuante no topo da tabela:
  - "X leads selecionados"
  - Dropdown nativo: campo a editar (Origem, Interesse, Status, Responsável se existir) — começamos com **Origem** e **Interesse** (já existem opções fixas / `useInteresseOptions`).
  - Select nativo com o novo valor.
  - Botão "Aplicar" → roda `supabase.from("leads").update({ campo: valor }).in("id", ids)` via novo hook `useBulkUpdateLeads` em `src/hooks/useLeads.ts`.
  - Toast de sucesso, invalida `["leads"]` e limpa a seleção.
- Botão "Limpar seleção".

**Visualização Kanban**: fora do escopo desta iteração (manter só na tabela, que é a tela natural para ação em lote). Se quiser depois, replicamos.

**Sem mudanças de schema** — usa update normal já coberto por RLS de `leads`.

## 3. Badge de mensagens novas no card do Kanban
Arquivo: `src/components/KanbanBoard.tsx` (card do lead, ~linhas 438-463).

Fonte de dados: tabela `inbox_conversations` já tem `unread_count` e (após a migração de 17/06) `lead_id` ligando à `leads`.

- Criar hook `useLeadUnreadCounts()` em `src/hooks/useInbox.ts`:
  - `select lead_id, unread_count from inbox_conversations where lead_id is not null and unread_count > 0`.
  - Agrega `Map<lead_id, total_unread>` (soma se houver múltiplas conversas para o mesmo lead).
  - Subscribe a realtime de `inbox_conversations` (já habilitado) para invalidar a query quando mudar.
- No `KanbanBoard`, chamar o hook e, no card, mostrar uma **bolinha vermelha** no canto superior direito (ou ao lado do nome) com o número quando `unread > 0`:
  - `<span className="bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">{n}</span>`
  - Se >99, mostra "99+".
- Quando o usuário abrir o Inbox e ler a conversa (já zera `unread_count` lá), o badge some automaticamente via realtime.

Opcional (confirmar): mostrar também na visualização Tabela? Por padrão **sim**, mesma bolinha numa coluna nova ou ao lado do nome. Posso adicionar se quiser.

## Detalhes técnicos
- Nenhuma migração de banco necessária — todas as colunas já existem (`unread_count`, `lead_id` em `inbox_conversations`).
- Bulk update respeita RLS atual de `leads` (user_id = auth.uid()), nada a ajustar.
- Realtime já está ligado em `inbox_conversations`.
- Sem `<Select>` Radix em modal — barra de ação na tabela vai usar `<select>` nativo conforme padrão do projeto.
