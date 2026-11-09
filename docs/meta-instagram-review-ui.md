# Interface em inglês para a revisão do Instagram pela Meta

## Escopo e comportamento

O administrador e as contas tester (revisão da Meta) veem inglês somente em
`/integracoes`, `/estudio` e suas subrotas. Os demais usuários continuam em
português. O papel é o existente no CRM; não se concedem privilégios ou novos
acessos para mudar o idioma. Um admin visualizando uma conta por impersonação
continua admin e vê inglês nessas áreas. A conta cliente, acessada diretamente,
continua em português.

O contexto de idioma fica isolado em `src/i18n`; o seletor de escopo/idioma pode
ser ampliado depois, sem espalhar testes de administrador pelos componentes.
Componentes compartilhados usam português por padrão fora do contexto. O idioma
HTML acompanha o contexto e é restaurado ao sair. Não há novo seletor ou tela.
Nomes de projetos, nomes de pessoas, descrições, legendas, hashtags, IDs, valores
salvos e payloads da integração permanecem originais. Os rótulos de status e tipos
de ensaio são traduzidos para exibição, mas seus valores internos não mudam.
Datas/calendários usam o locale da interface, preservando o fuso de agendamento.

## Integração e dados reais

O cartão do Instagram mostra status, username e Instagram Account ID obtidos do
cadastro conectado. IDs não são apresentados como usernames. Sem username ou ID,
mostra indisponível; não inventa dados. As condições existentes de conexão/validade
do token continuam as mesmas. O teste de conexão existente consulta a API real e
já retorna account_type; Business/Creator só são indicados quando esse dado estiver
disponível na resposta. Sem teste/sem resposta, o tipo fica não informado. Esse tipo
é informação da última verificação nesta tela, não uma classificação deduzida nem
uma nova garantia de permissões concedidas.

A explicação deixa claro o uso de username/ID/foto para identificar e selecionar
a conta e o envio de imagens aprovadas, legenda e hashtags para o feed quando a
pessoa confirma uma publicação/agendamento. Não exibe badges de permissões aprovadas
ou estados de publicação fictícios. O public_profile não sofreu alteração.

## Foto no feed e resultado da publicação

O fluxo já aceita uma foto, um slide e legenda com hashtags. Com uma imagem, o
publicador existente usa o caminho de foto individual no feed; com várias, usa o
carrossel existente. A prévia continua composição DOM e miniaturas assinadas;
os originais/canvas continuam reservados para exportação e publicação.

A tela de revisão permite criar conteúdo, abrir a prévia, selecionar o perfil,
aprovar e publicar, com rótulos em inglês para o admin. A legenda digitada é
preservada, incluindo hashtags. O modal mostra legenda e hashtags para conferência.
A prévia informa foto no feed quando há uma imagem e não usa username fictício
quando nenhuma conta foi selecionada.

A confirmação visual exige `status = publicado` e um Instagram Media ID real.
Também aparece no detalhe de um post publicado no calendário. O botão de abrir
no Instagram exige um permalink HTTPS válido efetivamente retornado pela Meta.
Não se converte ID numérico do Graph em shortcode nem se constrói URL presumida.

## Única exceção necessária no backend, informada antes da alteração

O publicador não retornava permalink. Para cumprir a abertura do post real:

- A migração 0017 acrescenta `scheduled_posts.instagram_permalink`, texto opcional.
  Não altera RLS, donos, posts existentes, legendas ou datas; registros anteriores
  ficam com NULL e não são republicados ou consultados automaticamente.
- Depois da confirmação de publicação e gravação do ID/status existentes, a função
  `publish-instagram-carousel` faz GET do campo permalink da mídia publicada, na
  mesma Graph API já usada. O token vai no cabeçalho, nunca nessa nova URL.
- A URL real é validada e gravada opcionalmente. Falha/timeout da consulta não muda
  a publicação para falhou e não provoca nova tentativa de publicar. Sem URL real,
  a interface mostra link indisponível, mantendo o ID confirmado.
- Posts já publicados retornam ID/link armazenados sem publicar novamente.

Autenticação, início/callback OAuth, escopos, destinos de autenticação e regras de
seleção/agendamento/publicação não foram alterados. Nenhum novo endpoint CRM foi
criado. Os escopos em análise continuam instagram_business_basic e
instagram_business_content_publish. Nenhuma permissão é declarada como concedida
apenas por a interface estar em inglês.

## Implantação no Lovable Cloud

1. Sincronizar main e aplicar `drizzle/migrations/0017_instagram_publication_permalink.sql`,
   já registrada no journal. Em ambiente Supabase CLI, usar a cópia equivalente
   `supabase/migrations/20261109190000_instagram_publication_permalink.sql`.
2. Publicar **somente publish-instagram-carousel** para a consulta opcional de link,
   e validar/publicar o frontend. Aplicar a migração antes da função/frontend, pois
   a consulta do calendário passa a incluir a coluna opcional.
3. Não republicar as funções de WhatsApp ou retomar o incidente de WhatsApp nesta
   tarefa. Não alterar app ID, secrets, redirects, permissões ou clientes existentes.
4. Verificar como administrador que Integrações/Studio estão em inglês; verificar
   como cliente/tester comum que continuam em português. Demais áreas continuam
   com o idioma anterior, inclusive para o administrador.
5. Com conta Instagram profissional de teste realmente conectada, clicar Test
   connection e conferir username, ID e tipo reais. Não usar dados de exemplo na
   gravação enviada à Meta.
6. Para uma demonstração real autorizada, criar projeto, enviar uma foto própria,
   selecionar uma foto e um slide, gerar/revisar o conteúdo, escrever legenda e
   hashtags, abrir Preview post, aprovar, selecionar Instagram e Publish to
   Instagram. Conferir o retorno da Meta e Open post on Instagram. Isso publica
   conteúdo real: não executar automaticamente numa conta de cliente.
7. Conferir também múltiplos perfis e agendamento existentes. Se o link não vier,
   não inventar URL e não publicar de novo: verificar somente o resultado da consulta.

Não houve publicação real no Instagram nem aplicação em Cloud por este ambiente.
As verificações locais usam serviços simulados em testes, nunca estados fictícios
injetados na interface de produção. A confirmação final com API/conta real depende
da implantação e da demonstração acima.

## Arquivos alterados

- `src/i18n/ReviewLocale.tsx` e `en-review.json`: contexto, seleção por papel/rota,
  catálogo de inglês, interpolação e locale de datas.
- `src/App.tsx`: aplica o contexto nas áreas solicitadas, preservando os gates.
- `src/components/DashboardLayout.tsx`, `Sidebar.tsx`, `DatePickerField.tsx`,
  `TimePickerField.tsx` e `SearchSelect.tsx`: textos/controles herdando o contexto.
- `src/pages/IntegracoesPage.tsx`, `src/components/integracoes/InstagramCard.tsx`
  e `GoogleCalendarCard.tsx`: textos da área e detalhes reais do Instagram.
- `src/pages/estudio/EstudioPage.tsx`, `NovoProjetoPage.tsx`, `ProjetoPage.tsx` e
  `CalendarioPage.tsx`: criação, edição, publicação, calendário e confirmação.
- `src/components/studio/CarouselEditor.tsx`, `CarouselSlide.tsx`,
  `GenerationControls.tsx`, `InstagramAccountSelect.tsx`, `LayoutSelector.tsx`,
  `PhotoCard.tsx`, `PhotoGallery.tsx`, `PhotoPickerDialog.tsx`, `PostPreviewModal.tsx`,
  `ProjectCard.tsx`, `ScheduleModal.tsx` e `UploadArea.tsx`: rótulos e mensagens dos
  componentes existentes, sem reconstruir layouts.
- `src/components/studio/PublishedInstagramPost.tsx` e
  `src/lib/instagramPublication.ts`: confirmação e validação de link verdadeiro.
- `src/hooks/useSocial.ts` e `src/integrations/supabase/types.ts`: leitura/tipos do
  novo campo opcional, preservando os campos existentes.
- `supabase/functions/publish-instagram-carousel/index.ts`: lookup opcional de
  permalink após publicar e retorno do ID/link para posts já publicados.
- Migração 0017 nas duas árvores, journal e snapshot Drizzle: coluna opcional.
- `src/test/metaReviewUI.test.tsx`, `studioReviewData.test.tsx` e
  `instagramFunctions.test.ts`: tradução por papel/rota, dados reais/ausentes,
  foto individual, caption/hashtags intactas, valores internos não traduzidos,
  validação do permalink e falha opcional sem mudar sucesso ou republicar.
- Este guia: implantação e roteiro de demonstração.

## Validação realizada

156 testes passaram. TypeScript e build passaram. A migração foi aplicada duas
vezes em PostgreSQL temporário com um post existente e preservou owner, status e
media ID, deixando apenas a nova coluna como NULL. Nenhum dado real foi alterado.
