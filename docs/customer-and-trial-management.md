# Gestão de clientes e testes grátis

## Problema e correção

O consolidado de Relatórios excluía apenas administradores; o uso excluía
bloqueadas, planos básicos e testers da Meta, mas ainda incluía testes grátis.
Isso misturava públicos nos totais e na normalização do score de adoção.

A classificação agora usa o acesso real retornado pelo RPC existente
`admin_list_crm_access`, junto às flags do perfil e ao papel tester. Não é baseada
em nome, e-mail, origem de cadastro ou atividade. Nenhum usuário foi alterado.

- **Cliente**: modo manual (plano liberado) ou legacy (acesso anterior mantido).
  Para consolidados/uso de clientes, precisa ter acesso permitido e não estar
  bloqueado. Clientes com plano vencido permanecem na gestão, fora desses totais.
- **Teste grátis**: modo trial, inclusive quando vencido ou aguardando e-mail.
  Aparece na gestão e em uma visão separada de uso, sem contaminar clientes.
- **Conta interna**: papel administrador ou tester técnico (como o tester da Meta).
  Não é misturada com clientes ou testes comerciais de 60 dias.
- **Não classificada**: sem modo de acesso reconhecido. Nunca é presumida cliente.
- **Bloqueada**: permanece disponível na gestão pelos filtros, mas não entra nos
  consolidados ou em nenhuma das duas populações de uso.

Os clientes antigos com acesso mantido continuam sendo clientes. Uma conta trial
convertida para manual passa a cliente mesmo se conservar trial_started_at.
Bloquear, desbloquear e liberar plano usam as operações existentes, sem novas
regras de autenticação, cobrança, assinatura ou prazo.

## Tela Clientes

A tela abre com Clientes + Ativos. Oferece busca por nome/e-mail, ignorando acentos,
filtro de tipo e filtro de situação. Os cartões Clientes ativos, Em teste grátis,
Testes vencidos e Contas bloqueadas aplicam os respectivos filtros ao clicar.
As linhas mostram tipo, estado do acesso e dias restantes quando o teste é ativo.
Todas as contas continuam administráveis pelas opções Todas as contas/Todas as
situações; contas internas e não classificadas também têm filtros explícitos.

Para converter um teste em cliente, liberar o plano contratado na aba existente
Acessos e testes. Não mudar o modo de uma pessoa somente para fazê-la aparecer no
relatório. Confirme o cadastro/contratação antes de liberar acesso manual.

Os indicadores de uso nas linhas respeitam o grupo de cada conta. Não há score de
mês anterior se a conta ainda não existia naquele mês. A busca da gestão e as
consultas auxiliares foram paginadas para não parar silenciosamente em mil contas.

## Uso

Dois públicos independentes:

- **Clientes**: padrão, no último mês fechado, somente clientes ativos.
- **Testes grátis**: começa no mês atual e inclui testes ativos, vencidos e pendentes
  de confirmação para acompanhamento. Bloqueados continuam fora. As linhas indicam
  situação e dias restantes do teste ativo.

Mudar o público inicia seu período padrão e fecha detalhes da seleção anterior.
É possível consultar os outros meses pelos controles existentes. Score, média,
taxa de adoção, comparações, resumo da equipe, detalhes e CSV usam apenas o grupo
selecionado. O score é normalizado por grupo; volume de testes não muda o score dos
clientes. O resumo copiado informa o público e o CSV o identifica no nome.

Foi preservada a exclusão anterior de planos básicos da análise de adoção, além de
administradores e testers técnicos. Os relatórios consolidados continuam incluindo
clientes básicos ativos, como antes; só a regra existente do score os exclui.

Não se conta uma conta em mês anterior à sua criação. O corte usa o mês UTC das
métricas existentes. A classificação de cliente/teste/bloqueado é a **atual**,
aplicada ao período consultado; não reconstrói o plano que existia em cada data
histórica. O histórico de atividades permanece intacto.

## Relatórios consolidados

Leads, tarefas, etapas e histórico de etapas são consultados usando uma lista
positiva dos IDs de clientes ativos. Sem classificação pronta ou sem clientes,
não se faz consulta irrestrita. Erros são apresentados e não geram fallback para
todas as contas. Drill-downs são fechados quando a população muda.

O mesmo público é usado no investimento de anúncios e no ROAS. Linhas com client_id
explícito precisam apontar para cliente ativo; um client_id de teste/bloqueado não
é substituído por coincidência de conta Meta. Linhas sem client_id só entram quando
a conta Meta identifica um único perfil e ele é cliente ativo. Vínculos ambíguos ou
sem dono elegível ficam fora. Essa regra só altera seleção de dados, não vínculos.

Os relatórios individuais do próprio usuário, inclusive usuários trial, continuam
funcionando. A seleção explícita/impersonação administrativa permanece disponível
para suporte. A exclusão trata consolidados e análises de adoção, sem apagar dados
ou remover permissões individuais.

## Implantação e conferência no Lovable

**Nenhuma migração adicional e nenhum redeploy de função são necessários para
esta melhoria.** Sincronizar main, conferir na prévia e publicar o frontend.
A migração 0017 e o publicador Instagram pertencem à tarefa anterior; esta alteração
não modifica nem substitui suas instruções. Não republicar funções de WhatsApp.

Conferir, sem alterar contas reais:

1. Clientes abre em Clientes/Ativos; usuários em teste não estão nessa lista.
2. Buscar Ítalo Guedes com o filtro Testes grátis e conferir que seu modo real é
   trial. Não há exceção por nome no código. Se o modo cadastrado divergir, informar
   antes de alterar qualquer cadastro ou prazo.
3. Contas bloqueadas aparecem no filtro de gestão, fora de Uso e do consolidado.
4. Uso/Clientes não mostra trials; Uso/Testes grátis mostra somente seu grupo.
   Conferir mês atual, mês anterior, comparações e resumo copiado.
5. Exportar CSV de cada grupo e conferir que não mistura clientes e trials.
6. Abrir o consolidado de Relatórios e conferir os mesmos clientes elegíveis em
   leads, funil, tarefas, anúncios, receita e ROAS.
7. Com contas sintéticas, bloquear/desbloquear e converter trial para plano manual;
   conferir atualização do grupo. Não mexer no prazo de clientes reais para testar.
8. Login comum trial deve continuar vendo os próprios relatórios e os mesmos
   recursos de antes, sujeito às regras de acesso já existentes.

Não foi consultado ou alterado nenhum cliente real neste ambiente. A conferência
nominal de Ítalo e dos totais reais depende da prévia/Cloud.

## Arquivos principais

- `src/lib/accountSegments.ts`: classificação e seleção compartilhadas.
- `src/hooks/useAdminAccountSegments.ts`: leitura do acesso/flags/papéis existentes.
- `src/components/admin/AccountDirectoryFilters.tsx` e `src/pages/AdminPage.tsx`:
  filtros, busca, contagens e identificação das contas.
- `src/components/admin/UsageTab.tsx`, `UsageAdoptionSummary.tsx` e
  `src/hooks/useUsageMetrics.ts`: públicos separados em scores, detalhes e exports.
- `src/hooks/useReportData.ts`, `useMetaAdsReport.ts`,
  `src/components/reports/ReportFilters.tsx` e `src/pages/RelatoriosPage.tsx`:
  consolidado positivo, elegibilidade de anúncios e tratamento de falhas.
- `src/hooks/useAccountAccess.ts`, `useAdminUsers.ts` e
  `src/components/admin/EditAdminUserModal.tsx`: paginação/invalidação de caches
  para refletir criação, edição, bloqueio e mudança de acesso.
- Testes `accountPopulations.test.tsx`, `accountPopulationUI.test.tsx`,
  `adminAccountSegments.test.tsx` e fixtures: critérios, hooks, filtros e CSV.

## Validação

192 testes passaram na versão sincronizada com as correções recentes do Lovable, incluindo 21 verificações novas da separação e seus efeitos.
TypeScript e build passaram. Não há alteração de banco ou de funções backend.
