

## Plano: Integração Lead → Cliente + Aba Contratos na Sidebar + Reposicionar Admin

### 3 entregas

---

### 1. Fluxo "Fechado Ganho" → Criar Cliente → Criar Cobrança

Quando um lead for movido para "Fechado Ganho" (tanto no Kanban por drag-and-drop quanto no Drawer por seleção de status), em vez de apenas atualizar o status, o sistema vai:

1. **Atualizar o status** do lead para "Fechado Ganho" normalmente
2. **Abrir um modal de criação de cliente** pré-preenchido com os dados do lead (nome, whatsapp, origem)
3. Após criar o cliente, **abrir o modal de criação de cobrança** com o cliente já vinculado

**Arquivos editados:**
- `src/components/KanbanBoard.tsx` — adicionar estado para o modal de cliente pós-ganho, interceptar `moveLeadToStatus` quando status = "Fechado Ganho" para abrir o modal após a mutation
- `src/components/LeadDetailDrawer.tsx` — mesma lógica no `handleStatusChange` e `handleRequiredFieldsConfirm`
- `src/components/clientes/NovoClienteModal.tsx` — aceitar props opcionais `initialData` (nome, whatsapp, origem) para pré-preencher, e um callback `onClienteCreated(clienteId)` além do fluxo atual de cobrança

**Novo componente:**
- `src/components/LeadToClienteFlow.tsx` — componente que orquestra o fluxo em 2 passos (criar cliente → criar cobrança), reutilizando os modais existentes. Recebe o lead como prop e controla a sequência.

### 2. Aba "Contratos" na Sidebar

- Adicionar item `{ id: 'contratos', label: 'Contratos', icon: FileText }` no `baseMenuItems` do `Sidebar.tsx`
- Adicionar rota `/contratos` no `App.tsx` apontando para `ComingSoon` com ícone de FileText
- Mapear no `DashboardLayout.tsx` o `getActiveItem`

### 3. Reposicionar menu Admin (Clientes) mais para baixo

No `Sidebar.tsx`, mover a renderização dos `adminMenuItems` para **depois** do bloco Financeiro, ficando como último item antes do botão "Sair". Atualmente ele já fica depois do Financeiro, mas vou garantir que fique separado com um pequeno divisor visual ou espaço extra.

---

### Resumo de arquivos

| Arquivo | Ação |
|---|---|
| `src/components/Sidebar.tsx` | Adicionar "Contratos", reposicionar Admin |
| `src/components/DashboardLayout.tsx` | Mapear rota contratos |
| `src/App.tsx` | Rota /contratos → ComingSoon |
| `src/components/KanbanBoard.tsx` | Fluxo pós-ganho |
| `src/components/LeadDetailDrawer.tsx` | Fluxo pós-ganho |
| `src/components/clientes/NovoClienteModal.tsx` | Props initialData + onClienteCreated |
| `src/components/financeiro/NovaCobrancaModal.tsx` | Aceitar clienteId pré-selecionado via prop |
| `src/components/LeadToClienteFlow.tsx` | Novo — orquestrador do fluxo |

