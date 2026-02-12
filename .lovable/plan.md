
# Evolucao CRM v1.0 - Hub para Fotografos

## Resumo

Transformar o sistema atual em um CRM completo estilo Pipedrive com modulos de Servicos, Pacotes compostos, Kanban de leads e pagina de detalhes com historico de notas. As categorias de fotografia serao campos de texto livre (nao enum fixo), permitindo que cada fotografo cadastre os tipos que quiser.

---

## Etapa 1 - Banco de Dados (Migracoes SQL)

### Nova tabela `services`
- id, user_id, nome, categoria (text livre - ex: "Casamento", "Debutante", "Corporativo", "Batizado", etc), descricao, valor_base, custo_interno (opcional), ativo (boolean, default true), created_at, updated_at
- RLS por user_id

### Evolucao da tabela `packages`
- Adicionar colunas: descricao (text), categoria (text), preco_final (numeric)
- Nova tabela `package_services` (id, package_id FK, service_id FK, created_at) com RLS

### Nova tabela `lead_notes`
- id, lead_id (FK leads), user_id, content (text), created_at
- RLS por user_id

### Alteracao na tabela `leads`
- Atualizar o enum `lead_status` para as novas etapas do Kanban:
  - Novo Lead, Contato Iniciado, Proposta Enviada, Follow-up, Contrato Enviado, Fechado Ganho, Fechado Perdido
- Adicionar coluna `origem` (text) - de onde veio o lead
- Adicionar coluna `package_id` (uuid, FK para packages, nullable)

### RLS
- Todas as novas tabelas seguem o padrao existente: SELECT/INSERT/UPDATE/DELETE restrito a `auth.uid() = user_id`
- `package_services` usa join com packages para validar user_id

---

## Etapa 2 - Hooks e Camada de Dados

- `useServices` - CRUD completo para servicos
- `usePackageServices` - vincular/desvincular servicos de pacotes, calcular valor total
- `useLeadNotes` - CRUD de notas dentro de cada lead
- Atualizar `useLeads` e `usePackages` para os novos campos

---

## Etapa 3 - Pagina de Servicos (nova)

- Rota `/servicos`
- Tabela listando servicos com filtro por categoria e status (ativo/inativo)
- Modal para criar/editar servico
- Campo categoria como input de texto com sugestoes (combobox) baseadas nas categorias ja usadas pelo usuario

---

## Etapa 4 - Pagina de Pacotes (evolucao)

- Rota `/pacotes`
- Interface para criar pacote selecionando multiplos servicos cadastrados
- Calculo automatico do valor total dos servicos selecionados
- Campo para preco final do pacote
- Exibicao do percentual de economia automaticamente
- Vinculo a uma categoria

---

## Etapa 5 - Kanban Board para Leads

- Componente `KanbanBoard` com 7 colunas (Novo Lead ate Fechado Perdido)
- Cards arrastaveis usando drag-and-drop com HTML5 Drag API (sem dependencia extra)
- Ao mover um card, atualiza o status no banco
- Toggle para alternar entre visualizacao Kanban e Tabela na pagina de Leads
- Cards mostram: nome, WhatsApp, interesse/pacote, data do evento

---

## Etapa 6 - Pagina de Detalhes do Lead (estilo Pipedrive)

- Ao clicar em um lead (no Kanban ou tabela), abrir modal/drawer com visao completa
- Aba de informacoes do lead (dados, origem, pacote vinculado)
- Aba de timeline/historico com notas
- Area para adicionar novas anotacoes
- Historico de mudancas de status exibido na timeline
- Campo "Origem" (Instagram, Indicacao, Google, etc) como texto livre com sugestoes

---

## Etapa 7 - Menu Lateral Atualizado

Novo menu:
- Dashboard
- Leads (Kanban + Tabela)
- Servicos (novo)
- Pacotes (novo)
- Agenda
- Mensagens
- Relatorios

---

## Detalhes Tecnicos

### Categorias flexiveis
Em vez de usar um enum fixo para categorias de fotografia, sera usado campo `text` livre. Um combobox mostrara sugestoes baseadas nas categorias ja cadastradas pelo usuario (query distinct), permitindo qualquer tipo: Casamento, Debutante, Infantil, Corporativo, Batizado, Ensaio, Formatura, Cabine, e qualquer outro que o fotografo precise.

### Enum de status do lead
Migrar de:
`Sem resposta | Interessado sem resposta | Sem interesse | Em andamento | Indisponibilidade Agenda | Fechado`

Para:
`Novo Lead | Contato Iniciado | Proposta Enviada | Follow-up | Contrato Enviado | Fechado Ganho | Fechado Perdido`

Isso requer renomear valores do enum existente e atualizar leads existentes.

### Drag-and-drop
Implementado com HTML5 Drag API nativa (onDragStart, onDragOver, onDrop), sem bibliotecas extras.

### Sequencia de implementacao
1. Migracoes de banco (tudo numa unica migracao)
2. Hooks de dados
3. Servicos + Pacotes (paginas)
4. Kanban + Detalhes do Lead
5. Menu lateral + rotas

Isso e uma evolucao grande, entao sera implementado em etapas sequenciais para manter estabilidade.
