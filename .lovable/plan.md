## Mudanças

### 1. Sidebar — seções colapsáveis (dropdown)

Transformar cada seção (Vendas, Clientes, Financeiro, Configurações) em um grupo colapsável com setinha (chevron) no cabeçalho. Estado inicial: **todas fechadas**, exceto a seção que contém a rota ativa (abre automaticamente). Estado guardado em `localStorage` para persistir entre sessões.

Reorganização pedida:
- **Vendas:** Leads, Tarefas, Relatórios, WhatsApp, Inbox
- **Clientes:** Clientes, Agenda, Contratos, **Serviços, Pacotes, Equipe** (movidos de Configurações)
- **Financeiro:** Dashboard, Cobranças, Despesas
- **Configurações:** IA, Integrações

"Início" continua fora das seções, no topo, sempre visível.

### 2. Versionamento automático

Regra confirmada: a cada mensagem sua que gere alteração, incremento o **patch** (`3.1.1 → 3.1.2 → … → 3.1.9`). Ao passar de 9, incremento o **minor** e zero o patch (`3.1.9 → 3.2.0`). O **major** (3) só muda quando você pedir.

- Fonte única da versão: constante `CRM_VERSION` em `src/lib/version.ts` (novo arquivo), lida pelo Sidebar e por `package.json` (manual).
- Nesta entrega já subo para **`3.1.2`** (esta mensagem = 1 alteração). Nas próximas mensagens com alteração, subo mais um.

### 3. Redesign da página Início

Manter o mesmo sistema de design (tema dark, primária ciano/turquesa), mas elevar o visual:

**Hero de boas-vindas**
- Saudação dinâmica ("Bom dia, {nome}") com data por extenso.
- Subfaixa com o período da semana atual.
- Fundo com `bg-gradient-glow` sutil no topo do conteúdo.

**Faixa de KPIs (4 cards compactos)**
- Tarefas de hoje (clientes + leads somados)
- Eventos da semana
- A receber na semana (valor em BRL, cor primária)
- A pagar na semana (valor em BRL, cor destructive)
- Cards com ícone em pill colorida, número grande em `font-display`, hover com leve elevação.

**Grid principal (2 colunas no desktop, 1 no mobile)**

Coluna esquerda — Tarefas
- Card único "Tarefas de hoje" com abas internas **Clientes / Leads** (contador em cada aba).
- Linhas mais elegantes: avatar/inicial colorida, título, subtítulo (nome do lead/cliente), pill de data à direita (vermelha se atrasada).

Coluna direita — Semana
- **Agenda da semana:** timeline vertical com marcador por dia, evento agrupado por data.
- **Recebimentos vs Despesas:** um único card com duas colunas lado a lado, cada uma listando os itens; totais no topo em ciano (receita) e vermelho (despesa); saldo líquido da semana em destaque no rodapé.

**Detalhes visuais**
- Cabeçalhos de card com divisor sutil.
- Estado vazio com ícone grande em `text-muted-foreground/40` e mensagem curta.
- Animação `animate-fade-in` escalonada nos cards.
- Scroll interno com `scrollbar-thin` (via utilitário Tailwind).

Sem alterar dados ou hooks — só `src/pages/InicioPage.tsx` e talvez um subcomponente `InicioKpiCard.tsx`.

## Arquivos afetados

- `src/components/Sidebar.tsx` — seções colapsáveis, mover Serviços/Pacotes/Equipe, ler versão da constante.
- `src/lib/version.ts` *(novo)* — `export const CRM_VERSION = "3.1.2"`.
- `src/pages/InicioPage.tsx` — redesign completo.
- `src/components/inicio/InicioKpiCard.tsx` *(novo)* — card de KPI reutilizável.
- `package.json` — bump para `3.1.2`.
