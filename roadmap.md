# Roadmap

## Concluído
- Sprint 02 — Funil de Leads: relatórios migrados para pipeline_stages/lead_stage_history com paridade total (v3.10.0)
- Sprint 03 — Funil de Leads personalizável: stage_id como fonte operacional, editor de etapas (criar/renomear/colorir/reordenar/excluir) via RPCs, Kanban/Drawer/Modal/Tabela/Dashboard/Admin migrados, status legado mantido em sincronia por trigger (v3.11.0)

- Vigia do WhatsApp ignora contas bloqueadas/sem acesso (v3.19.1)
- Causa raiz dos atrasos do WhatsApp identificada (falha da Evolution 2.3.7 com status/stories; corrigida na v2.3.8)
- WhatsApp Caminho 1: vigia automático a cada 10 min com reinício e aviso "Reconectar QR"; "sempre online" mantido desligado (v3.19.0)

## Pendências
- Atualizar a Evolution da VPS para v2.3.8 (corrige a causa raiz dos atrasos: aviso de status/stories sem confirmação derruba a conexão a cada 50 min e trava a fila) — depende do usuário no Easypanel; depois conferir atraso de Igor, Eduardo, Gilberto e Soares Photos
- Limpeza do banco da Evolution (>30 dias) deixou de ser necessária para os atrasos; opcional
- Falha de segurança em manage-evolution (cliente pode desconectar/excluir conexão de outro) — aguardando pedido
- Item 0 da Sprint 02 pendente: registrar migrations da Sprint 01 em supabase/migrations — não forçado (diretório é gerenciado pelo sistema; drizzle/migrations é o sistema vigente)
- Flávio Cardoso: sem conta Meta encontrada — precisa do ID
- Confirmar Denilson Alves → 1086802835630668
