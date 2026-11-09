# Studio: propriedade ao trabalhar como administrador

## Erro encontrado e corrigido

As listagens de projetos e as conexões/agendamentos do Instagram usam
`useEffectiveUserId`, a conta selecionada pelo administrador. Já criação de
projetos, upload de fotos, carrosséis, slides e ligações de fotos usavam
`useAuth().user.id`, a conta que fez login. Isso permitia publicar no Instagram
selecionado mantendo o projeto e o conteúdo sob a conta administrativa.

Agora essas gravações usam a conta selecionada. Uploads ficam em
`<cliente>/<projeto>/<arquivo>` no bucket `project-photos`. Antes de enviar fotos
ou salvar carrossel, o projeto precisa pertencer à conta selecionada. Para editar
um carrossel existente, seu projeto e dono também precisam corresponder.
Agendamentos verificam que carrossel e conexão Instagram são da mesma conta.
As consultas de detalhes incluem dono no filtro e na chave de cache.
`deleted_by` continua sendo o usuário que executou a ação, para preservar autoria.

As políticas existentes davam ao administrador SELECT/UPDATE/DELETE, mas não
INSERT para outra conta. A migração 0013 acrescenta INSERT administrativo, exigindo
cliente existente, correspondência com o pai e pasta de upload do projeto correto.
Usuários comuns mantêm as próprias regras e o bloqueio de acesso entre contas.
As regras de validade do CRM não são removidas. Não há transferência automática.

## Implantação no Lovable

1. Sincronizar a main e aplicar `drizzle/migrations/0013_studio_admin_create_for_client.sql`.
   A cópia equivalente para Supabase CLI é
   `supabase/migrations/20261109120000_studio_admin_create_for_client.sql`.
2. Na prévia, entrar como administrador, selecionar uma conta sintética cliente,
   criar projeto, enviar foto e salvar carrossel. Conferir que todos os registros
   pertencem à conta cliente e que ela própria consegue vê-los, abrir as fotos e
   editar o projeto ao entrar diretamente. A conta administrativa não deve listá-los
   em seus próprios projetos. Não publicar nada no Instagram real para esse teste.
3. Conferir seleção do perfil Instagram/agendamento usando mocks ou contas de teste.
   Carrossel de outra conta deve ser recusado.
4. Publicar o frontend depois de validar. Nenhuma Edge Function foi alterada e não
   é necessário redeploy de funções para esta correção.

## Conteúdo histórico do Renato

A correção não redistribui automaticamente conteúdo já gravado sob outra conta.
Executar `docs/diagnostics/studio-renato-ownership.sql` após confirmar o UUID da
conta exata do Renato. A consulta só lê IDs, proprietários e metadados do histórico,
sem tokens. Ela mostra divergências entre projeto, carrossel, post e dono da conexão
Instagram, inclusive publicações já realizadas.

Para corrigir o histórico no Cloud:

- Identificar os IDs exatos dos projetos e confirmar o destino com as relações de
  publicação. Não transferir tudo da Avanzo nem inferir dono pelo título do ensaio.
- Se um projeto tiver publicações de várias contas ou conexões de donos distintos,
  interromper a transferência automática e separar a revisão desse caso.
- Conferir também todos os carrosséis, fotos, slides, vínculos de fotos e eventuais
  agendamentos do projeto. Um rascunho sem vínculo de publicação não tem destino
  comprovado e exige identificação explícita.
- Para cada projeto confirmado, preparar uma transação com os IDs revisados para
  corrigir o `user_id` de todos os registros relacionados. Não recriar posts nem
  alterar `instagram_media_id`, status publicado ou datas do histórico.
- Arquivos privados antigos sob a pasta da Avanzo também precisam de cópia para a
  pasta do Renato, atualização de `photos.storage_path`/`image_url` e dos caminhos
  em `carousels.rendered_slides`/`rendered_meta`, quando aplicável. Só alterar o dono
  das linhas pode deixar imagens inacessíveis. Verificar metadados reais antes de
  preparar as cópias; manter os arquivos originais até validar o acesso do Renato.
- Após a correção revisada, validar login direto do Renato, abertura dos projetos,
  fotos, carrosséis e histórico. Nenhuma publicação deve ser reenviada à Meta.

Não há acesso ao banco/Storage do Cloud neste ambiente. O erro de código foi
reproduzido com contas fictícias; quais projetos reais foram afetados e sua
recuperação precisam dessa conferência no Cloud.

## Testes locais

- `npx vitest run src/test/studioOwnership.test.tsx src/test/socialAccounts.test.tsx --maxWorkers=2`
- `node scripts/test-studio-client-inserts.mjs`
- `npm test -- --maxWorkers=2`
- `npx --no-install tsc --noEmit -p tsconfig.app.json`
- `npm run build`

Os testes de hooks simulam login Avanzo com conta Renato selecionada, login direto,
usuário ausente, caminho de upload, carrosséis/slides/fotos e recusa de relações
incompatíveis. O PostgreSQL temporário aplica a migração duas vezes e testa
permissões administrativas, correspondência de donos/pastas, cliente existente e
negação entre contas comuns. Não acessam clientes reais ou publicam no Instagram.
