# Correção dos cinco achados críticos de isolamento

Migração: `supabase/migrations/20261103210000_fix_reported_tenant_isolation.sql`.

## O que muda

1. `public.ai_config`: remove as três políticas abertas. Configurações e suas
   credenciais ficam acessíveis ao proprietário e aos administradores.
2. `public.ai_files`: remove as políticas abertas de consulta, inserção e exclusão.
   Metadados de arquivos passam a respeitar a conta proprietária.
3. `public.whatsapp_instances`: remove as três políticas abertas de consulta,
   inserção e atualização. Configurações e tokens são isolados por conta.
4. `public.messages`: remove as duas políticas abertas. Para o cliente, a mensagem
   precisa pertencer ao seu usuário e estar vinculada a um lead da mesma conta.
   Não é possível usar o próprio user_id com um lead de outro usuário.
5. `storage.objects`, bucket `inbox-media`: remove `inbox-media service update`
   e impede gravação, substituição e exclusão por credenciais de cliente. Esse
   bucket é alimentado pelo webhook com service-role. Uploads de navegador do
   CRM continuam usando o bucket separado `ai-files`, cujas regras não mudam.

Os limites por proprietário são políticas restritivas. Outra regra permissiva
legada não pode anular esse limite. WITH CHECK também impede a troca do dono de
um registro. O acesso administrativo e a ingestão com service-role são preservados.
As políticas de validade do teste grátis continuam valendo em conjunto.

A migração não apaga, move ou redistribui registros ou arquivos. Registros sem
proprietário, ou mensagens com proprietário e lead inconsistentes, ficam fora do
acesso comum. Administradores podem revisá-los; a migração não adivinha seu dono.
As URLs públicas e a leitura já existente das mídias não foram alteradas. Esta
correção não torna os buckets públicos privados e não é uma auditoria completa
contra todos os demais caminhos de API do produto.

## Implantação e verificação no Lovable Cloud

1. Aplicar a migração indicada. Não é necessário redeploy de funções para essas
   alterações de RLS, que passam a valer diretamente no banco.
2. Consultar as políticas do ambiente e repetir a varredura Security para os
   cinco achados. Não marcar os alertas como ignorados para liberar a publicação.
3. Validar com duas contas sintéticas normais: cada uma deve ver e gerenciar
   somente seus dados; tentativas de referenciar a outra conta devem falhar.
   Validar também suporte/impersonação administrativa e recebimento de mídia
   pelo webhook. Não usar credenciais reais em testes de invasão entre contas.
4. Revisar a rotação das credenciais afetadas de IA e WhatsApp. As permissões
   antigas permitiam acesso indevido; corrigir a regra não invalida uma chave
   que eventualmente tenha sido copiada. Não há confirmação de exploração nesta
   revisão e não foram consultados valores de chaves ou registros de clientes.

Consulta de metadados para conferir o resultado, sem retornar credenciais:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('ai_config', 'ai_files', 'whatsapp_instances', 'messages'))
   OR (schemaname = 'storage' AND tablename = 'objects' AND
       (policyname LIKE 'inbox%media%' OR policyname = 'crm_active_access'))
ORDER BY schemaname, tablename, policyname;
```

## Teste de regressão reproduzível

```sh
npm ci
npm run test:security
npm test -- --maxWorkers=2
```

`test:security` cria um PostgreSQL em memória via PGlite. Não lê variáveis de
conexão, não acessa rede ou banco remoto e usa somente contas, arquivos e valores
sintéticos. Reproduz as regras vulneráveis, aplica a migração duas vezes e verifica
isolamento, INSERT com dono forjado, troca de dono, mensagens com lead alheio,
negação anônima, administração, service-role, proteção das mídias, preservação de
outros buckets e compatibilidade com o vencimento do teste grátis.

Os sete `@ts-nocheck` acrescentados anteriormente nas funções não são removidos
por esta migração. Suprimir o checker não corrige tipos; isso é um trabalho
separado dos cinco achados de RLS tratados aqui. O callback Google já foi verificado
separadamente retornando HTTP 303 em vez do HTML antigo.
