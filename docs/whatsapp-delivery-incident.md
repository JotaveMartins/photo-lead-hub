# Incidente: atraso nas mensagens de WhatsApp

## Estado e limites da conclusão

Em 09/11/2026 o Lovable relatou atrasos em Eduardo Nunes (~70h), Renato Soares
(~64h), Denilson Alves (~44h), Samuel Bueno (~28h), Soares Photos (~18h) e Gilberto
Pinheiro (~17h). Esses valores são de uma observação, não um monitoramento atual.
O relato de Igor aponta mensagens antigas entregues em blocos e ausência da
mensagem do Wesley. Não se confirmou descarte de fila no provedor: reconexão e
mudança da idade das mensagens são correlação; é preciso histórico/entrega do
servidor para provar perda ou descarte.

O código revisado não contém agendamento de reinício a cada 50 minutos. O webhook
trata eventos de estado e verifica a conexão após 15 segundos para evitar alerta
falso. Um evento de estado não comprova reinício do processo/servidor. Conferir
watchdogs, timers e logs de infraestrutura e da Evolution antes de atribuir causa.

**Durante a coleta não reconectar, desconectar, recriar instâncias, reconfigurar
webhooks, limpar filas, importar históricos ou reproduzir eventos.** Não executar
`sync-inbox-messages` para diagnosticar: essa função grava dados.

## Consulta administrativa somente de leitura

Publicar `diagnose-whatsapp-delivery`, incluindo `inspect.ts` e o módulo compartilhado
`_shared/whatsapp-time.ts`. A configuração `verify_jwt = false` segue o padrão das
funções existentes, mas o handler exige JWT válido e confere `has_role(...,'admin')`
antes de ler instâncias, configuração ou contatar o provedor. Não aceita API key de
BI, URL arbitrária ou nomes de instância fornecidos pelo cliente.

A função lê instâncias existentes pelos UUIDs explícitos, obtém a configuração
internamente e chama somente:

- GET `/instance/connectionState/<instância>`;
- POST `/chat/findMessages/<instância>`, operação de consulta, sem importação.

Também lê os logs do CRM e procura os IDs retornados em inbox_messages. Não insere,
atualiza ou exclui registros nem chama rotas de envio/conexão. Não retorna textos,
anexos, payload completo, api_key, token ou URL do servidor. Retorna apenas IDs,
estado, horários, amostra de atraso e presença no Inbox. Não há contagem de fila
oferecida por essas rotas; o resultado declara `queue_status: not_observed`.

Identificar e confirmar os UUIDs das instâncias das seis contas pelo cadastro do
CRM. Não escolher homônimos automaticamente. Exemplo de invocação, **com sessão
administrativa já existente**, sem colar tokens no código ou em URLs:

```ts
await supabase.functions.invoke('diagnose-whatsapp-delivery', {
  body: {
    instance_ids: ['<UUID da instância confirmada>'],
    from: '2026-11-06T00:00:00-03:00',
    to: '2026-11-10T00:00:00-03:00',
    max_pages: 2
  }
});
```

Pode consultar até sete instâncias explícitas, intervalo de até sete dias e no
máximo dez páginas totais por chamada. Preferir uma instância por chamada para
facilitar evidência e reduzir latência; não fazer polling contínuo. São 50 mensagens
por página do provedor e até 200 eventos recentes do CRM, retornando até 50 mensagens
individuais recebidas. `provider_sample_limited` informa limite/paginação repetida.
Os limites são deliberados: não se deve interpretar essa amostra como auditoria
completa. Verificar se o provedor respeitou filtros/ordenação comparando os horários.
Falhas HTTP/formato geram erro explícito, não histórico vazio.

## Como interpretar e fechar o diagnóstico

1. Guardar snapshot com conta/instância, horário da coleta e IDs/horários da amostra.
   Confirmar relógios/fusos do servidor e do WhatsApp antes de calcular atraso.
2. `crm_received_sample.delay_seconds` compara horário original com recebimento do
   webhook da mesma mensagem. Isso mede atraso observado de ponta a ponta, mas
   não identifica sozinho qual estágio atrasou.
3. Se a Evolution tem IDs recentes ausentes no Inbox, consultar logs de recepção
   e tentativa de entrega desses IDs: status HTTP, duração, retries e erro.
   Não reenviar durante essa investigação. Se a Evolution também só tem mensagens
   antigas, investigar ingestão/sincronização WhatsApp-Baileys.
4. No servidor Evolution, consultar somente para leitura: versão implantada,
   uptime/reinícios, CPU/memória/disco, Redis/filas quando usados, job mais antigo,
   falhas/retries, concorrência e logs de sessão/entrega. Não usar rotas de conexão
   ou limpar jobs. A consulta do CRM não possui acesso aos logs internos do host.
5. Comparar o padrão de ~50 minutos com timers/watchdogs reais, reinícios do
   processo e erros Baileys. Não deduzir a causa só do evento connection.update.
6. Ausência de mensagem no provedor ou nos logs antigos é inconclusiva se houve
   retenção limitada. Uma conversa sem tráfego recente não prova atraso pela idade
   da última mensagem. Pedir evidência de mensagem recente existente no WhatsApp,
   com ID/horário quando disponível, sem disparar teste automaticamente.
7. Apresentar uma linha por conta: instância, estado, horário da amostra, atraso
   medido para IDs conhecidos, IDs no provedor/CRM, limitação e causa confirmada
   ou hipótese. Só depois propor recuperação/reconexão, com snapshot preservado.

## Wesley / Igor

Pesquisar a instância confirmada do Igor em 07/11/2026 inicialmente entre 12h e
16h de Brasília; ampliar para todo o dia antes de concluir ausência. Para uma
pesquisa direcionada, passar `jids` com as variantes PN confirmadas do contato
(com/sem DDI e nono dígito) ou LID comprovado pelos registros. No máximo quatro
JIDs, uma instância por chamada. O endpoint não adivinha a relação entre LID e PN.
Consultar `docs/diagnostics/igor-wesley-inbox.md` para os dados já levantados.
Não associar Wesley Kosta/grupo ao contato apenas pela semelhança do nome.

## Horário original: correção preparada

O webhook antigo omitia `inbox_messages.timestamp`, fazendo o banco usar a hora
de chegada. Agora grava `messageTimestamp` original (segundos, milissegundos ou
protobuf Long) e mantém `created_at` como hora de recebimento. Timestamp ausente,
inválido ou muito no futuro usa recebimento como fallback. Logs novos registram
apenas ID da instância/mensagem e tempos/atraso, sem corpo ou telefone.

Inbox e conversa do lead ordenam os registros carregados pelo horário original,
com fallback para created_at e desempate determinístico. O sincronizador usa o
mesmo parser, mas não é acionado por esta mudança. Nada disso recupera mensagens
que não chegaram, resolve a fila ou corrige retroativamente horários antigos.
A data de criação de leads não é reescrita nem retroagida.

### Implantação em duas etapas

1. Para investigar imediatamente, publicar só `diagnose-whatsapp-delivery` com
   seus módulos. Executar as consultas administrativas nas seis instâncias antes
   de qualquer reconexão. Não chamar o sincronizador ou APIs de envio.
2. Em seguida validar a correção de horários com payload sintético na prévia e
   publicar `evolution-webhook` e `sync-inbox-messages` com o módulo compartilhado,
   além do frontend. Publicar código dessas funções não requer reconectar o WhatsApp.
   Não chamar manualmente o webhook real nem importar histórico para testar.

Não há migração de banco. A migração 0015 do Studio é independente deste incidente.
Nenhum backend foi implantado nem conta real consultada por este ambiente.

## Testes

`src/test/whatsappDelivery.test.ts` exercita parser/ordenação, consultas de leitura,
autenticação e papel administrativo, limites, metadados sem credenciais e gravação
do horário original pelo handler real do webhook com serviços simulados.

```sh
npm test -- --maxWorkers=2
npx --no-install tsc --noEmit -p tsconfig.app.json
npm run build
```

## Versão confirmada e ajuste da consulta (09/11)

O usuário confirmou Evolution 2.3.7 em servidor Hostinger. A revisão do código
oficial dessa versão identificou um erro nos parâmetros do diagnóstico inicial:
`fetchMessages` exige `page` e `offset`, e aplica filtro de horário somente com
`gte` **e** `lte`, convertidos internamente com `new Date(...)`. O diagnóstico
inicial usava take/skip e segundos numéricos gte/lt, que esse método ignora.
Isso explica o filtro ignorado sem indicar, por si só, defeito da Evolution.

Referência exata revisada, sem acessar o servidor do cliente:
https://github.com/EvolutionAPI/evolution-api/blob/cd800f2976e1e5b682fbf86a01ee4d85ae61f370/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts#L5016

A consulta de diagnóstico foi corrigida para a versão 2.3.7. O fim exclusivo da
janela vira lte em ISO um milissegundo antes. A paginação usa page/offset e total
quando disponível; o resultado inclui `provider_window_respected` (null sem dados,
true quando os horários retornados respeitam a janela, false quando divergem).
A função continua somente leitura, sem modificar sessões, mensagens ou configurações.
Ajustes locais no servidor podem diferir da tag oficial e precisam ser conferidos.

**Republicar somente `diagnose-whatsapp-delivery` e seus módulos** para este ajuste.
Primeiro consultar uma instância com max_pages=1, confirmar que janela conhecida
retorna seus registros e janela posterior sem tráfego fica vazia. Depois paginar
com max_pages=2 e conferir IDs distintos. Preservar o campo crm_log_error adicionado
pelo Lovable; timeout do banco não deve descartar a amostra do provedor.
Não republicar webhook/sincronizador nem mudar o servidor nesta etapa.

O código oficial usa Baileys `7.0.0-rc.9` e emite `statusReason` nos eventos de
conexão. Isso não estabelece a causa do atraso nem justifica atualização imediata.
A causa do ciclo de 50 minutos exige confrontar statusReason/logs e o estado real
do processo, sem reiniciar ou invalidar sessão.

### Primeira coleta no VPS pelo titular

No hPanel da Hostinger, abrir VPS, escolher o servidor confirmado, Visão geral e
Terminal. O Manager da Evolution gerencia a aplicação; não equivale ao console do
VPS. Os nomes dos botões podem variar. Não é necessário compartilhar senha/chave.

Executar somente:

```sh
uptime
free -h
df -h
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

Esses comandos não reiniciam serviços nem mostram variáveis de ambiente. Retornar
a saída para identificar recursos e nomes reais dos containers. Se algum comando
não existir ou não houver permissão, retornar o erro, sem instalar/alterar nada.
Não usar docker inspect completo, env, arquivos .env ou logs brutos neste primeiro
passo: podem expor credenciais. Não pedir docker compose up/pull, restart, prune,
limpeza de Redis ou atualização do WhatsApp antes de analisar a coleta.
