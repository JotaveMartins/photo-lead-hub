# Link do WhatsApp na bio

A área WhatsApp passa a ter um cartão “Link do WhatsApp”. Uma conta tem um link editável, com nome exclusivo, telefone e mensagem. O administrador usa a conta em visualização, conforme a impersonação existente.

Mensagens prontas selecionáveis nos botões:

- Instagram (padrão para novos links): “Olá, vim pelo Instagram, gostaria de mais informações”.
- Google Meu Negócio: “Olá, vim pelo Google, gostaria de mais informações”.

O texto continua editável. Selecionar uma opção apenas preenche o formulário; é necessário salvar para alterar o link. Mensagens já salvas não são substituídas automaticamente. Continua sendo um link por conta, com a mensagem escolhida.

Endereço oficial: `https://crm.avanzodigital.com.br/w/{slug}`. O campo converte acentos, espaços e outros separadores antes de salvar (exemplo: Flávio Silva → flavio-silva), e a prévia já mostra o endereço final. O slug usa 3 a 50 letras minúsculas, números e hífens, começando e terminando com letra ou número. Nenhum link ou cliente é criado automaticamente. Com um único canal conectado, o botão mostra nome e telefone e preenche o campo em um clique. Com vários canais, um seletor controlado identifica o escolhido e preenche o telefone. A edição manual remove a indicação de canal selecionado. Números salvos nunca são substituídos automaticamente ao carregar; também é possível digitar um número sem conectar uma instância. Números brasileiros com DDD recebem 55; números internacionais devem incluir + e DDI.

Editar telefone ou mensagem preserva o endereço. Mudar o nome exige confirmação e invalida o endereço anterior. O número do link não muda automaticamente quando uma instância é desconectada, trocada ou apagada. Isso evita alterar o destino público sem confirmação. O link não depende da conexão Evolution para abrir o WhatsApp.

## Aplicação no Lovable Cloud

1. Sincronizar a main sem restaurar versões antigas. Confirmar que as proteções existentes do publicador e do agendador permanecem.
2. Aplicar **somente uma vez** a migração `drizzle/migrations/0020_whatsapp_bio_links.sql` (espelho Supabase: `20261110120000_whatsapp_bio_links.sql`). Não executar ambos: são a mesma migração.
3. Publicar o frontend após conferir a prévia. Não há Edge Function nova nem necessidade de republicar Evolution, sincronização de mensagens ou publicador.
4. Confirmar que acesso direto a `/w/nome` serve o frontend (fallback SPA já usado em outras rotas públicas, como `/g/:slug`).

O endereço público é uma rota SPA fora dos layouts protegidos. Carrega o frontend, consulta uma função PostgreSQL anônima para **um slug exato**, depois chama `window.location.replace` para `https://wa.me/{phone}?text={mensagem codificada}`. Não há login, tela promocional ou contagem regressiva. Há um texto breve de abertura e um link de fallback caso o navegador não abra o aplicativo. Isto não é um redirecionamento HTTP no servidor; um redirecionamento sem carregar o frontend exigiria configuração adicional do host/domínio. O desempenho real deve ser validado em celular/Instagram após publicar.

## Segurança

- Tabela `whatsapp_bio_links` com RLS, sem acesso anônimo, um registro por usuário e slug único global.
- Usuário ativo acessa e altera somente o próprio link. Administrador pode gerenciar o cliente selecionado.
- RPC pública `resolve_whatsapp_bio_link` retorna somente telefone e mensagem de um slug exato. Não oferece listagem de contas, identificadores internos ou credenciais.
- Contas bloqueadas e acessos vencidos/sem plano válido não são resolvidos. Conta antiga com acesso mantido e teste válido funcionam.
- Destino fixo `https://wa.me/`, telefone validado e texto codificado. Não aceita URL arbitrária como destino.
- Nenhuma chamada à Evolution API, reconexão, importação de mensagens ou alteração nas regras existentes de WhatsApp.

## Validação

- `npm test -- --maxWorkers=2`: suíte completa incluindo testes de formulário, isolamento por conta em visualização, conflito de nome, codificação de mensagem e falha segura ao carregar.
- `node scripts/test-whatsapp-bio-links.mjs`: PostgreSQL temporário isolado. Valida RLS entre contas, administração, consulta anônima limitada, nome duplicado, bloqueio e vencimento. Nenhum dado real.
- TypeScript e build de produção.
- Navegador Chromium com respostas de banco fictícias e destino WhatsApp interceptado: rota pública sem sessão, erro de link inexistente e encaminhamento para o destino correto. Não envia mensagens reais.

Após aplicar, validar com uma conta sintética: criar sem instância, selecionar número conectado, copiar e abrir em aba anônima, atualizar mensagem mantendo endereço, tentar nome já ocupado e conferir bloqueio/vencimento. Remover a conta sintética e seu link depois. Não foi aplicado ao banco real pelo Codex.
