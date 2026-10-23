# Vários perfis do Instagram

Em **Configurações → Integrações**, cada usuário pode conectar vários perfis
profissionais. Cada perfil tem suas próprias ações de testar a conexão,
reconectar e desconectar. Ao autorizar novamente o mesmo perfil, a conexão
existente é atualizada; outro perfil cria uma conexão separada.

No **Estúdio IA**, o seletor de perfil aparece no projeto e na confirmação de
publicação. A prévia usa o perfil selecionado. Com um único perfil disponível,
ele é selecionado automaticamente; com vários perfis disponíveis, a pessoa
escolhe o destino. Perfis expirados precisam ser reconectados.

Publicar agora e agendar usam o ID do perfil escolhido. O calendário mostra o
perfil de cada publicação. Desconectar um perfil não apaga os outros; posts
pendentes desse perfil ficam sem conexão e não são redirecionados para outro.

## Implantação

Esta alteração exige banco, funções e frontend atualizados em conjunto. Publicar
somente o frontend no GitHub não atualiza automaticamente o banco ou as Edge
Functions, salvo se houver um pipeline já configurado para isso.

1. Aplicar a migração
   `supabase/migrations/20261023190000_multiple_instagram_accounts.sql` pelo fluxo
   habitual de migrações do projeto. Ela troca a unicidade por usuário/provedor
   pela unicidade por usuário/provedor/ID do Instagram, preservando conexões e
   referências existentes.
2. Imediatamente atualizar `instagram-auth-callback`,
   `test-instagram-connection` e `publish-instagram-carousel` no Supabase. O
   callback antigo usa o índice anterior: evitar novas conexões durante essa
   janela de implantação. Não é necessário atualizar `run-scheduled-posts`.
3. Publicar o frontend atualizado. Não é necessário cadastrar novos segredos
   ou mudar o callback OAuth registrado na Meta.

Não executar essas operações no banco de produção como parte de testes locais.

## Verificação

```sh
npm test -- --maxWorkers=2
npx --no-install tsc --noEmit -p tsconfig.app.json
npm run build
```

Os testes de frontend e funções usam serviços simulados, sem publicar conteúdo
real. Para validar a implantação, conectar dois perfis profissionais autorizados,
testar cada um e conferir a prévia ao alternar o seletor. Fazer uma publicação
autorizada em cada perfil e verificar que o agendamento guarda o perfil
escolhido. Reconectar um deles deve manter ambos na lista. Desconectar um não
deve afetar a conexão do outro nem mudar o destino de posts já agendados.
