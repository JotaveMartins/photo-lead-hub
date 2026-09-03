# Corrigir o "Status de adoção" com histórico de acessos

## O que está acontecendo

Os números de uso (leads, tarefas, financeiro...) estão certos. O problema é o sinal de "acessou no mês".

Hoje o sistema guarda apenas **um único carimbo por conta: o último acesso**. Não existe histórico. O cálculo do mês fechado (agosto) só marca "acessou no mês" quando esse último acesso cai **dentro de agosto**.

Dados reais confirmados:

- Igor Serra: último acesso 03/09/2026
- João Victor: 03/09/2026
- Tati Graciano: 03/09/2026
- Thiago Brandão: 02/09/2026

Como todos entraram em setembro, o último acesso saiu da janela de agosto e eles caem em "Sem acesso no mês". Por isso os 19 clientes ficaram Inativos e a Taxa de adoção deu 0%: quem mais usa o CRM é justamente quem é penalizado.

## Solução: registrar o histórico de acessos

Criar um registro de acesso por dia por conta, gravado sempre que o usuário entra no CRM. A partir daí:

- "Acessou no mês" passa a ser exato: houve pelo menos um dia de acesso dentro do mês analisado.
- Passa a existir a informação de **dias ativos no mês**, que aparece no detalhe da conta (drawer) e no CSV.
- O Status de adoção e a Taxa de adoção passam a refletir o uso real.

O histórico começa a valer a partir de agora, então meses já fechados não têm registro. Para não mostrar tudo como Inativo nesse período, usamos uma regra de transição para meses sem histórico:

- Conta é considerada como tendo acessado o mês se o último acesso é igual ou posterior ao início daquele mês, ou se houve atividade manual dela no mês (leads, tarefas concluídas, cobranças, despesas, eventos, clientes, contratos, entregas, projetos).
- Movimentações automáticas (Inbox e leads criados pelo robô) continuam **não** valendo como adoção.

Com isso, Igor Serra (Score 10, 93 leads, 248 tarefas) passa a Engajado já no mês atual e nos anteriores.

## Detalhes técnicos

- Nova tabela `public.user_access_log` (`user_id`, `dia date`, `hits int`, `created_at`), única por `(user_id, dia)`, com GRANTs e RLS: usuário grava/lê o próprio registro; admin lê tudo via `has_role`.
- Gravação idempotente (upsert por dia) no mesmo ponto do app que hoje atualiza `ultimo_acesso`; `ultimo_acesso` continua sendo atualizado como está.
- `admin_usage_metrics` passa a retornar `dias_ativos` (contagem em `user_access_log` no mês) e a calcular `acessou_no_mes` assim: se existir qualquer registro de acesso da conta no mês, usa o histórico; senão aplica a regra de transição descrita acima.
- Front: `usageScore.ts` ganha o campo `dias_ativos` no tipo; `UsageDetailDrawer` e o CSV exibem os dias ativos. Badge de status e Taxa de adoção seguem a lógica já implementada.
- Fórmula do Score, layout, filtros e demais colunas permanecem inalterados.
