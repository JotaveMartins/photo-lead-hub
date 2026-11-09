# Igor / Wesley: investigação de 7 a 9 de novembro de 2026

Relato recebido em 09/11: três ou quatro contatos não teriam entrado no Inbox em
08/11; um exemplo é Wesley, com número exibido 8589758194. O número da imagem tem
10 dígitos. Procurar também com DDI 55 e o nono dígito, sem deduzir ou alterar o
cadastro. A consulta usa os oito últimos dígitos como pista, não como prova de
identidade; confirme a conta e o contato antes de qualquer associação.

## Data e números confirmados depois da primeira investigação

O usuário esclareceu que a conversa ocorreu em **07/11/2026 por volta das 14h**,
considerando o horário de Brasília (17h UTC). O Cloud informou criação manual do
lead às 13h54 nesse dia; por isso não limitar a busca a mensagens posteriores às
14h. Inspecionar inicialmente 12h-16h de Brasília e ampliar para todo o dia se
necessário. A consulta SQL agora inclui 07/11 inteiro, além de 08/11 e 09/11.

Os números completos do contato e do WhatsApp do Igor foram fornecidos na
conversa. Conferir a identidade da instância na Evolution contra o número do
Igor e procurar o contato com e sem DDI/nono dígito, incluindo correspondência
PN/LID. Não persistir tokens, payload completo ou contatos adicionais no relatório.

Consultar também o histórico da Evolution e seus registros de entrega HTTP para
o webhook do CRM. Mensagem ausente nos logs do CRM não prova ausência no WhatsApp.
Se a mensagem existe no provedor, registrar ID, horário original, instância,
JIDs e resultado de entrega ao CRM. Não reproduzir webhooks, reenviar mensagens
ou importar contatos durante essa etapa somente de leitura.

## Evidência disponível neste ambiente

- Código revisado em main. Sem acesso aos logs/banco de produção ou provedor.
- Nenhum cliente, contato, configuração ou mensagem real foi alterado.
- Os dois anexos OGG foram recebidos, mas não foi possível transcrevê-los: o
  modelo local de transcrição não pôde ser baixado. Não se inferiu seu conteúdo.
- A conversa é salva antes do gatilho de criação do lead. Ausência de palavra-chave
  não deveria impedir a conversa no Inbox. Lead automático depende de palavra-chave.
- Reproduzido isoladamente com dados sintéticos: `messages.upsert` com `data` como
  objeto é lido; o mesmo evento com `data` como array retorna 500 ao acessar
  `key.remoteJid`, antes da criação da conversa. Isso só explica este caso se o
  payload real confirmar o formato em lote.
- A recuperação `sync-inbox-messages` busca uma única página (`skip: 0`, até 200
  mensagens no modo geral) e não há agendamento dessa função no histórico de
  migrações. Isso não comprova a ausência de um agendamento externo no Cloud.
- A listagem principal do Inbox não pagina. Conversas fora do limite REST podem
  faltar na busca mesmo que existam no banco. Conferir volume e ordenação reais.

## Próximo passo no Lovable Cloud

1. Confirmar a conta exata do Igor. Não escolher automaticamente o primeiro nome
   correspondente se houver homônimos.
2. Executar `igor-wesley-inbox.sql` após substituir o UUID de segurança pela conta
   confirmada. É somente leitura. Não retornar payload completo, api_key ou tokens.
3. Cruzar IDs/horários do webhook, conversa e mensagem. Um webhook recebido não
   comprova processamento: `processed` não é atualizado pelo handler atual.
4. Se o log mostrar `data_shape = array` e mensagem ausente, conferir os logs da
   Edge Function para o erro `Cannot read properties of undefined (reading 'remoteJid')`.
5. Se a mensagem estiver no banco, conferir filtro, conta selecionada, nome/telefone,
   LID e limite da listagem antes de tentar importar ou criar outro registro.
6. Se não houver evento, conferir a instância do Igor, configuração de webhook,
   entrega HTTP e histórico da Evolution em 07/11, por volta das 14h de Brasília. Ausência no banco de logs não
   prova ausência no provedor: também pode haver erro anterior à gravação do log.
7. Se estiver no Inbox mas sem lead, comparar o texto inicial com gatilhos ativos e
   conferir erros de inserção de lead. O webhook atual ignora esse erro no gatilho.
8. Informar a causa sustentada por IDs/horários e o estado do Wesley. Não recriar
   contatos, importar em massa, reproduzir webhooks ou disparar mensagens durante
   a investigação. Reavaliar recuperação direcionada somente após diagnóstico.

O caso ainda não foi confirmado em produção. As falhas do código listadas acima
não devem ser apresentadas como causa comprovada do relato sem o cruzamento real.
