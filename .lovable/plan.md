## Objetivo

1. Registrar **todas** as mudanças de um lead no Histórico (origem, datas, valor, interesse, pacote, status, motivo/observação de perda, whatsapp, nome), independente de onde a mudança acontece (drawer, kanban, tabelas, modais de campos obrigatórios, motivo de perda, edge functions).
2. Marcar cada entrada como **Manual** ou **Automático** (ex.: criação via "criar lead" do Inbox, datas de entrada de etapa preenchidas por trigger, cadência gerada ao iniciar atendimento).
3. Rodar o sync do Meta Ads da conta do Saulo manualmente.

## Estado atual (verificado)

- `lead_history` só é gravado em `LeadDetailDrawer.tsx > handleFieldSave`. Mudanças feitas via Kanban (drag), `RequiredFieldsModal`, `LossReasonModal`, `LeadModal` e edge functions **não** aparecem no timeline.
- Não existe distinção manual/automático — todas as entradas hoje são efetivamente manuais.
- Conta Meta do Saulo: `meta_ad_account_id = 10150838015447315` cadastrado, mas 0 linhas em `meta_daily_ads` para o `client_id` dele.

## Mudanças

### 1. Banco (migration)

- `lead_history`: adicionar coluna `source text not null default 'manual'` com check `('manual','automatic')`.
- `leads`: adicionar coluna `created_via text not null default 'manual'` (valores: `'manual' | 'inbox_auto'`).
- Novo trigger `zzz_track_lead_field_changes` em `AFTER UPDATE ON leads`:
  - Compara OLD vs NEW para os campos: `nome, whatsapp, interesse, origem, valor, data_evento, data_contato, data_proposta, package_id, status, motivo_perda, observacao_perda, iniciar_atendimento` e para todas as `data_entrada_*`.
  - Insere uma linha em `lead_history` por campo alterado, com `user_id = NEW.user_id`.
  - `source`: lê `current_setting('app.history_source', true)`; se for `'automatic'`, marca automático; caso contrário `'manual'`.
- Ajustar `track_lead_stage_dates` e `create_cadence_task_on_contato` para chamar `perform set_config('app.history_source','automatic', true)` no início — assim as datas de etapa preenchidas por trigger entram como automáticas.
- Novo trigger `zzz_lead_created_history` em `AFTER INSERT ON leads`: insere entrada "Lead criado" com `source = 'automatic'` se `created_via = 'inbox_auto'`, senão `'manual'`.
- GRANTs já cobrem `lead_history` (INSERT via trigger roda como definer/owner).

### 2. Edge function `evolution-webhook`

- No ponto onde cria lead automático (origem "Tráfego Pago"), passar `created_via: 'inbox_auto'` no insert.

### 3. Frontend

- `src/hooks/useLeadHistory.ts`: adicionar `source: 'manual' | 'automatic'` ao tipo.
- `src/components/LeadDetailDrawer.tsx > handleFieldSave`: **remover** o `createHistory.mutate` (o trigger passa a ser fonte única, evita duplicidade). Manter apenas o `updateLead.mutate`.
- Timeline (item `change`): renderizar badge ao lado do label:
  - `Automático` (cinza/muted) quando `source === 'automatic'`
  - `Manual` (primary suave) quando `source === 'manual'`
- Mapa `FIELD_LABELS` já cobre os campos principais; complementar rótulos que faltarem (ex.: `created_via`, `ai_paused` fica de fora do rastreamento).

### 4. Sync Meta Ads do Saulo

- Invocar a edge function `sync-meta-ads` para o `user_id` do Saulo (`8042a01c-...`) com backfill de ~90 dias.
- Verificar o resultado consultando `meta_daily_ads` e reportar quantas linhas foram inseridas / erro retornado pela function, se houver.

## Detalhes técnicos

- O trigger de captura fica em `AFTER UPDATE` (não BEFORE) para enxergar o NEW já com efeitos dos BEFORE triggers (`track_lead_stage_dates`, `create_cadence_task_on_contato`), mantendo a semântica correta de "quem mexeu no campo".
- `set_config(..., true)` é local à transação, então não vaza entre requisições.
- Remover a inserção de histórico no cliente elimina a divergência de rótulos e evita dupla entrada quando o trigger passar a rodar.
- Campos de tarefa/cadência (`cadencia_*`, `follow_up_*`) atualmente rastreados no `FIELD_LABELS` do drawer não existem em `leads` — permanecem sem histórico (comportamento igual ao atual).

## Fora do escopo

- Retroatividade: não vamos gerar histórico para mudanças antigas.
- Notas e tarefas continuam com o comportamento atual no timeline.
