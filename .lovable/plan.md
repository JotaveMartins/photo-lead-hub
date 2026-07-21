## 1. Reorganização do menu lateral

Novo agrupamento em `src/components/Sidebar.tsx` (com cabeçalhos de seção não clicáveis):

- **Início** (item raiz, no topo)
- **Vendas**: Leads, Tarefas, Relatórios, WhatsApp, Inbox
- **Clientes**: Clientes, Agenda, Contratos
- **Financeiro**: Dashboard (Resumo), Cobranças, Despesas
- **Configurações**: IA, Integrações, Serviços, Pacotes, Equipe
- **Admin** (mantido separado, só para admins) + **Anúncios**

Ajustes técnicos:
- Cabeçalhos de seção com estilo discreto (`text-xs uppercase text-muted-foreground`) e um pequeno divisor entre grupos.
- Ícones mantidos por item; seção continua expandida por padrão (sem colapso por enquanto — pode virar melhoria futura).
- Atualizar `DashboardLayout.tsx` `PAGE_TITLES` e mapeamento `getActiveItem` para incluir `inicio`.

## 2. Tela de Início

Nova página `src/pages/InicioPage.tsx` na rota `/inicio`, definida em `src/App.tsx` dentro do `ProtectedLayout`. Redirect `"/"` passa a apontar para `/inicio` (antes ia para `/leads`).

Layout:

```text
┌─────────────────────────────────────────────┐
│  Olá, {nome} — Semana de {seg} a {dom}      │
├──────────────────────┬──────────────────────┤
│  Tarefas de hoje     │  Tarefas de hoje     │
│  — Clientes          │  — Leads             │
│  (lista scroll)      │  (lista scroll)      │
├──────────┬───────────┴──────┬───────────────┤
│ Agenda   │  Recebimentos    │  Despesas     │
│ da semana│  da semana       │  da semana    │
└──────────┴──────────────────┴───────────────┘
```

Fontes de dados (hooks já existentes, filtrados por `useEffectiveUserId`):
- **Tarefas hoje – Leads**: `useLeadTasks` filtrando `due_date === hoje` e `status !== 'concluida'`.
- **Tarefas hoje – Clientes**: tarefas ligadas a `cliente_id` (verificar se `lead_tasks` já cobre; caso não, usar tabela de tarefas de cliente existente — inspecionar antes de codar).
- **Agenda da semana**: `useEvents` no intervalo seg–dom da semana corrente.
- **Recebimentos da semana**: `useCobrancas` com `vencimento` na semana corrente (status `aguardando` ou `paga`).
- **Despesas da semana**: `useDespesas` com `data` na semana corrente.

Regra de "semana corrente": segunda 00:00 a domingo 23:59, timezone America/Sao_Paulo, usando `parseLocalDate` do `src/lib/utils.ts`.

Cada card mostra: título, contagem/total no cabeçalho, lista compacta (máx. 5 itens visíveis + scroll) e link "Ver todos" que navega para a página correspondente.

## 3. Rota inicial

- `<Route path="/" element={<Navigate to="/inicio" replace />} />` em `App.tsx`.
- Adicionar item **Início** (ícone `Home` do lucide) como primeiro item do Sidebar.

## Detalhes técnicos

- Nenhuma alteração de schema/DB. Só front-end.
- Sem mudança de business logic dos hooks; apenas consumo.
- Manter tokens de design (sem `text-white`/`bg-black` hardcoded).
- Sidebar mobile: verificar que os cabeçalhos de seção não quebram o layout do drawer.

## Fora do escopo (para confirmar depois)

- Colapso/expansão das seções e persistência da preferência.
- Personalização dos blocos da tela de Início.