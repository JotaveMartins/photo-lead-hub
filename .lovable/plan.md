# Ordenação de tarefas + desfazer conclusão

## 1. Coluna "Concluída em" e ordenação por coluna (página Atividades)

Na tabela de atividades:
- Nova coluna **Concluída em**, mostrando a data/hora em que a tarefa foi marcada como concluída (o campo já existe no banco: `completed_at`). Quando a tarefa ainda estiver pendente, mostra "—".
- Cabeçalhos clicáveis para ordenar em **Data de venc.**, **Criada em** e **Concluída em**, com seta indicando crescente/decrescente. Clicar de novo no mesmo cabeçalho inverte a ordem.
- Padrão: ordenado por data de vencimento, da mais próxima para a mais distante (comportamento atual).
- Tarefas sem data de conclusão vão sempre para o fim quando a ordenação for por "Concluída em".

## 2. Pop-up "Desfazer" ao concluir tarefa

Ao marcar uma tarefa como concluída (no sininho do topo, na tabela de Atividades, no calendário, na tela de Início e dentro do lead), aparece um aviso no **canto inferior esquerdo** da tela:

```text
Tarefa marcada como concluída        [ Desfazer ]
```

- Fica visível por ~4 segundos e some sozinho.
- Clicar em "Desfazer" reabre a tarefa (volta a pendente e limpa a data de conclusão), com confirmação rápida "Tarefa reaberta".
- Substitui o aviso atual "Tarefa concluída!".

Observação: o desfazer reabre a tarefa. Se a conclusão tiver gerado automaticamente a próxima tarefa de cadência, essa tarefa gerada permanece — o desfazer não a remove.

## Detalhes técnicos

- `src/hooks/useLeadTasks.ts`: no `onSuccess` de `useCompleteLeadTask`, trocar o `toast.success` por um toast do sonner com `action: { label: "Desfazer", onClick }`, `duration: 4000` e `position: "bottom-left"`. O undo chama o mesmo update de `useUncompleteLeadTask` (completed=false, completed_at=null) e invalida `["lead_tasks"]`.
- `src/pages/TarefasPage.tsx`: estado local `sortKey: "due_date" | "created_at" | "completed_at"` + `sortDir`, aplicado no `useMemo` de `filteredTasks` após os filtros; `TableHead` clicáveis com ícone de seta; nova `TableCell` para `completed_at` formatada em pt-BR.
- Nenhuma migração de banco necessária — `completed_at` já existe em `lead_tasks`.
- Versão do CRM para **3.3.0** em `src/lib/version.ts`.
