

# Plano: Ajuste do Fluxo de Tarefas do CRM

## Resumo

Reestruturar a logica de cadencia de tarefas para separar claramente 3 fases: Pre-Proposta (manter como esta), Follow-up (criar 1 tarefa por vez com confirmacao) e etapas finais (limpar tudo). Inclui modais de confirmacao e limpeza automatica de tarefas pendentes em cada transicao de etapa.

---

## Mudancas por Etapa

### 1. Proposta Enviada -- Mover automaticamente para Follow-up + Modal

**Comportamento atual:** Ao mover para "Proposta Enviada", cancela tarefas de cadencia pendentes via trigger no banco.

**Novo comportamento:**
- Ao mover para "Proposta Enviada", alem de cancelar tarefas pendentes, mover automaticamente o lead para "Follow-up".
- Exibir modal: "Deseja ativar sequencia recomendada de follow-up?"
  - **Sim:** Cria 1 tarefa "Follow-up 1" com data padrao D+2 (editavel antes de salvar).
  - **Nao:** Nao cria tarefas; usuario gerencia manualmente.

### 2. Conclusao de Follow-up -- Modal para proximo

**Comportamento atual:** Ao concluir tarefa de cadencia, cria proxima automaticamente.

**Novo comportamento para tarefas de follow-up:**
- Ao concluir uma tarefa de follow-up, exibir modal: "Deseja criar proximo follow-up?"
  - **Sim:** Cria "Follow-up N+1" com data sugerida D+3 (editavel).
  - **Nao:** Nao cria nada.
- Nunca criar multiplos follow-ups de uma vez.

### 3. Contrato Enviado -- Limpar tudo

**Comportamento atual:** Nao ha logica especifica.

**Novo comportamento:**
- Cancelar todas as tarefas pendentes automaticamente.
- Nenhum modal, nenhuma nova tarefa.

### 4. Fechado Ganho / Fechado Perdido -- Limpar tudo

**Comportamento atual:** Nao ha logica especifica.

**Novo comportamento:**
- Cancelar todas as tarefas pendentes automaticamente.
- Nenhum modal, nenhuma nova tarefa.

### 5. Pre-Proposta (cadencia 1-5) -- Manter como esta

- Ao clicar em "Iniciar atendimento", cria tarefas 1 a 5 sequencialmente.
- Ao concluir, cria a proxima automaticamente para o dia seguinte.
- Ao mover para "Proposta Enviada", cancela pendentes (ja implementado).

---

## Detalhes Tecnicos

### Banco de dados (Migration SQL)

Atualizar o trigger `delete_cadence_on_proposta` para:
- Apagar **todas** as tarefas pendentes (nao apenas `is_cadence = true`) quando o lead mover para "Contrato Enviado", "Fechado Ganho" ou "Fechado Perdido".
- Manter o comportamento atual para "Proposta Enviada" (apagar apenas cadencia pendente).

```text
Trigger expandido:
  IF status muda para "Proposta Enviada" -> DELETE tarefas WHERE is_cadence=true AND completed=false
  IF status muda para "Contrato Enviado", "Fechado Ganho", "Fechado Perdido" -> DELETE tarefas WHERE completed=false
```

### Novo componente: FollowUpModal

Componente React com dois usos:
1. **Ativacao de sequencia:** Aparece ao mover para "Proposta Enviada" -> "Follow-up". Pergunta se quer ativar sequencia. Se sim, permite editar a data (padrao D+2) e cria "Follow-up 1".
2. **Proximo follow-up:** Aparece ao concluir um follow-up. Pergunta se quer criar o proximo. Se sim, permite editar data (padrao D+3) e cria "Follow-up N+1".

### Alteracoes em `useLeadTasks.ts`

- `useCompleteLeadTask`: Separar logica de cadencia pre-proposta (auto-criar proxima) da logica de follow-up (retornar flag para o componente exibir modal em vez de criar automaticamente). A mutacao retornara um objeto indicando se o modal de follow-up deve ser exibido.
- Adicionar hook `useDeletePendingTasks` para limpar tarefas pendentes de um lead.

### Alteracoes em `KanbanBoard.tsx`

- Ao dropar lead em "Proposta Enviada":
  1. Validar campos obrigatorios (valor) -- ja existe.
  2. Apos confirmar, atualizar status para "Follow-up" (pular "Proposta Enviada" como etapa persistente, ou gravar "Proposta Enviada" e imediatamente mover para "Follow-up").
  3. Exibir FollowUpModal.

- Ao dropar em "Contrato Enviado", "Fechado Ganho", "Fechado Perdido": o trigger no banco limpa as tarefas automaticamente.

### Alteracoes em `LeadDetailDrawer.tsx`

- Ao mudar status via select para "Proposta Enviada":
  1. Mesma logica do Kanban: validar valor, mover para Follow-up, exibir modal.
- Ao concluir tarefa de follow-up: exibir FollowUpModal para confirmar criacao da proxima.

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| `supabase/migrations/novo.sql` | Atualizar trigger para cobrir Contrato Enviado, Ganho, Perdido |
| `src/components/FollowUpModal.tsx` | Novo componente de confirmacao de follow-up |
| `src/hooks/useLeadTasks.ts` | Ajustar logica de conclusao; distinguir cadencia vs follow-up |
| `src/components/KanbanBoard.tsx` | Interceptar drop em Proposta Enviada para redirecionar a Follow-up + modal |
| `src/components/LeadDetailDrawer.tsx` | Mesma logica no select de status + modal ao concluir follow-up |
| `src/components/RequiredFieldsModal.tsx` | Sem alteracao |

