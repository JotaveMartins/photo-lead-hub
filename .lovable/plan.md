# Corrigir o "Status de adoção" (todos aparecem como Inativo)

## O que está acontecendo

Os números de uso (leads, tarefas, financeiro...) estão certos. O problema é o sinal de "acessou no mês".

Hoje o sistema guarda apenas **um único carimbo por conta: o último acesso**. Não existe histórico de acessos. O cálculo do mês fechado (agosto) só marca "acessou no mês" quando esse último acesso cai **dentro de agosto**.

Dados reais confirmados:

- Igor Serra: último acesso 03/09/2026
- João Victor: 03/09/2026
- Tati Graciano: 03/09/2026
- Thiago Brandão: 02/09/2026

Como todos eles entraram em setembro, o último acesso deles saiu da janela de agosto e o sistema os classifica como "Sem acesso no mês". Por isso os 19 clientes ficaram Inativos e a Taxa de adoção deu 0%. Ou seja: quem mais usa o CRM é justamente quem é penalizado.

## Correção proposta

Em duas partes.

### 1. Correção imediata (sem mudar o Score)

Passar a considerar que a conta acessou o mês analisado quando o último acesso é **igual ou posterior ao início daquele mês**. Assim, quem acessou em setembro obviamente também estava ativo em agosto e deixa de cair em "Inativo".

Complemento: se a conta tiver atividade real registrada no mês (leads, tarefas concluídas, cobranças, eventos, clientes, contratos, entregas ou projetos criados por ela), isso também conta como acesso, mesmo sem carimbo de último acesso. Movimentações automáticas (Inbox e leads criados pelo robô) continuam **não** valendo como adoção.

Com isso, Igor Serra (Score 10, 93 leads, 248 tarefas) passa a Engajado.

### 2. Correção definitiva (histórico de acessos)

Criar um registro de acesso por dia por conta, alimentado quando o usuário entra no CRM. A partir do próximo mês fechado, o "acessou no mês" passa a ser exato (inclusive com o número de dias ativos), sem depender do último acesso. Meses anteriores continuam usando a regra do item 1.

## Detalhes técnicos

- Ajustar a função `admin_usage_metrics`: `acessou_no_mes` passa a ser `ultimo_acesso >= início do mês` OU soma de pilares manuais (tudo exceto `inbox`) maior que zero no mês.
- Nova tabela `public.user_access_log` (user_id, dia, contagem), com RLS: cada usuário grava/lê o próprio registro; admin lê tudo. Gravação idempotente por dia, disparada no mesmo ponto onde hoje o `ultimo_acesso` é atualizado.
- A função de métricas passa a retornar também `dias_ativos` no mês, usada como fonte preferencial de `acessou_no_mes` quando houver dados.
- Fórmula do Score, layout, filtros e demais colunas permanecem inalterados. Apenas o badge de Status de adoção e a Taxa de adoção passam a refletir o valor correto.
