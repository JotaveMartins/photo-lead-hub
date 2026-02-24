

## Plano: Motivos de Perda com Observação

### Contexto
O banco já possui o campo `motivo_perda` (text) na tabela `leads`. Precisamos:
1. Adicionar um campo `observacao_perda` (text) na tabela
2. Criar um modal que aparece ao mover um lead para "Fechado Perdido" (tanto no Kanban quanto no Drawer)
3. Exibir essas informações no painel de detalhes do lead

### Mudanças no Banco de Dados
- **Migration**: `ALTER TABLE leads ADD COLUMN observacao_perda text;`

### Mudanças no Código

#### 1. Novo componente: `src/components/LossReasonModal.tsx`
- Modal com select para motivo de perda (opções predefinidas):
  - Sem orçamento disponível
  - Fechou com outro fotógrafo
  - Sem resposta
  - Cancelou ou adiou o evento
  - Data indisponível
  - Lead desqualificado
  - Outro
- Campo textarea para observação (opcional)
- Botão "Confirmar" que retorna `{ motivo_perda, observacao_perda }`
- Motivo obrigatório, observação opcional

#### 2. `src/components/KanbanBoard.tsx`
- Importar e usar o `LossReasonModal`
- Ao dropar lead em "Fechado Perdido", abrir o modal ao invés de mover direto
- No confirm do modal, chamar `updateLead` com status + motivo + observação

#### 3. `src/components/LeadDetailDrawer.tsx`
- Ao mudar status para "Fechado Perdido" via select, abrir o `LossReasonModal`
- Na seção de detalhes (painel esquerdo), onde já mostra `motivo_perda` para leads perdidos, adicionar também a exibição da `observacao_perda`
- Ambos campos editáveis inline, visíveis apenas quando `status === "Fechado Perdido"`

#### 4. `src/components/RequiredFieldsModal.tsx`
- Remover a lógica de "Fechado Perdido" deste modal (se houver), pois agora será tratada pelo `LossReasonModal`

#### 5. `src/integrations/supabase/types.ts`
- Será atualizado automaticamente com o novo campo `observacao_perda`

### Fluxo do Usuário
```text
Arrasta lead → "Perdido"
       ↓
 LossReasonModal abre
  ├─ Select: motivo (obrigatório)
  ├─ Textarea: observação (opcional)  
  └─ Confirmar → salva status + motivo + obs
       ↓
 No drawer do lead perdido:
  Detalhes mostra motivo + observação
```

