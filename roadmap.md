# Roadmap

## Sprint 02 — Funil de Leads: migrar leitura dos Relatórios
- [ ] Item 0: avaliar registro das migrations da Sprint 01 em supabase/migrations (sem reaplicar; se inseguro, reportar pendente)
- [ ] Baseline legado (total, mês atual, mês anterior, consolidado)
- [ ] Estender useReportData com pipeline_stages + lead_stage_history (sem N+1)
- [ ] Criar src/lib/leadPipelineReporting.ts (helpers puros: firstStageEntry, firstRoleEntry, facts, report sets)
- [ ] Rewire RelatoriosPage + ReportDrillDown (data derivada)
- [ ] Testes de paridade (vitest fixtures)
- [ ] Comparação real antes/depois (total, mês atual, mês anterior) — diferença = 0
- [ ] Teste de rename won/proposal/lost; teste de saída de won; teste de reentrada
- [ ] Typecheck + testes + bump CRM_VERSION
- [ ] Atualizar memória lead-pipeline-stages

## Pendências anteriores
- Sprint 03 (personalização do funil de leads) — aguardando Sprint 02
- Flávio Cardoso: sem conta Meta encontrada — precisa do ID
- Confirmar Denilson Alves → 1086802835630668
