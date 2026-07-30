## 1. Aba "Conversa" do lead vira somente leitura

Em `src/components/LeadConversation.tsx`, esconder a área de composição (anexo, respostas rápidas, emoji, campo de texto, botão enviar e a linha de dica) atrás de uma flag `ENABLE_LEAD_CHAT_COMPOSER = false`. O código de envio permanece no arquivo, só não é renderizado — basta trocar a flag para reativar. Mantém o botão de sincronizar mensagens e o histórico.

## 2. Cores das etapas do funil de vendas

Em `src/components/KanbanBoard.tsx` (e nos badges de status correspondentes), aplicar gradiente frio → quente conforme o avanço:

```text
Novo Lead          cinza-azulado
Contato Iniciado   azul
Triagem Feita      ciano
Proposta Enviada   roxo
Follow-up          âmbar
Contrato Enviado   laranja
Fechado Ganho      verde
Fechado Perdido    vermelho
```

Cores como tokens HSL no `index.css` (`--stage-1` … `--stage-6`), sem cores hardcoded nos componentes.

## 3. Funil de Entregas (pós-venda) — em Clientes

**Onde fica:** nova página `/entregas` dentro da seção "Clientes" do menu lateral, mais uma aba "Entregas" no perfil do cliente mostrando só as entregas dele. O funil de vendas continua em Leads, intocado.

**Banco:** nova tabela `entregas` (com RLS por `user_id` e GRANTs), ligando cliente, lead e evento:
- `cliente_id`, `lead_id`, `event_id`, `service_id`
- `titulo`, `etapa` (enum: Ensaio Agendado, Ensaio Realizado, Prévia enviada, Em edição, Entregue)
- `data_ensaio`, `data_previa_prevista`, `data_entrega_prevista`, `data_entrega_final`
- `link_galeria`, `observacoes`, timestamps + `deleted_at` (soft delete) e datas de entrada em cada etapa (para relatório futuro)

Comecei com um conjunto enxuto de campos; dá para adicionar outros depois sem quebrar nada.

**Criação automática:** no fluxo de lead ganho (`src/components/LeadToClienteFlow.tsx`), ao confirmar o evento, criar também a entrega na etapa "Ensaio Agendado" já vinculada ao cliente, lead e evento, com `data_ensaio` = data do evento. Na tela de confirmação, mostrar "Entrega criada no funil de entregas".

**Tela `/entregas`:** kanban com as 5 colunas, drag-and-drop para mudar etapa (mesmo padrão visual do KanbanBoard atual), card com cliente, serviço, data do ensaio e data de entrega prevista, com destaque de atraso. Clique abre um drawer para editar datas, link da galeria e observações, com atalho para o cliente e para o evento na agenda.

**Perfil do cliente:** aba "Entregas" listando as entregas com etapa e datas, e botão para criar entrega manual (para trabalhos que não vieram de lead).

## Detalhes técnicos

- Hook `src/hooks/useEntregas.ts` (list/create/update/soft-delete) usando `useEffectiveUserId`, seguindo o padrão de `useEvents`/`useClientes`.
- Selects nativos nos formulários, `parseLocalDate` para datas, toasts de erro/sucesso e estados de loading.
- Rota nova em `src/App.tsx` e item de menu em `src/components/Sidebar.tsx` (seção Clientes).
- Bump de versão em `src/lib/version.ts`.

Ordem de execução: migração da tabela → hook → página/kanban → aba no cliente → integração no fluxo de ganho → cores → chat somente leitura.
