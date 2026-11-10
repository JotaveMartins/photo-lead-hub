# Gatilhos padrão para novas contas

Aplicar a migração `drizzle/migrations/0022_default_inbox_triggers.sql` uma vez (espelho `supabase/migrations/20261110140000_default_inbox_triggers.sql`; não executar ambos).

Todo cadastro futuro em `auth.users`, seja público ou criado pelo administrador, recebe quatro palavras-chave ativas:

- `vim pelo anúncio`
- `informações sobre`
- `vim pelo Instagram`
- `vim pelo Google`

São trechos, não mensagens completas. O webhook existente faz comparação sem diferenciar maiúsculas/minúsculas, por isso `Olá! Vim pelo Instagram e gostaria de mais informações` e `Olá, vim pelo Google, gostaria de mais informações` funcionam. A comparação continua exigindo os acentos presentes no trecho. O usuário pode editar/remover seus gatilhos normalmente; entrar novamente no CRM não os recria. Não há mudanças na Evolution API, no webhook, nas conexões ou no histórico. A origem atribuída aos leads pelo webhook existente não foi alterada por esta mudança.

A função nova é exclusiva do trigger, sem execução direta por usuários/visitantes. Não substitui o processamento de perfil, teste grátis, funil ou demais gatilhos de cadastro. Contas existentes não recebem backfill.

## Renato

O Codex não consultou o banco real. Antes de executar a inclusão, a Lovable deve conferir os gatilhos da conta `renatosoaresvenda@hotmail.com` e comparar com os quatro padrões acima. Informar se a referência do Renato tiver outros trechos relevantes, sem copiá-los automaticamente para todos.

Executar separadamente `maintenance/renato-add-google-inbox-trigger.sql`. Ele exige uma única conta com o e-mail exato, preserva todos os gatilhos e só acrescenta `vim pelo Google` se não existir uma palavra-chave contendo esse trecho, incluindo desativadas. Pode ser repetido sem duplicar o Google. Retorna a lista para conferência. Se houver Google desativado, manter a escolha e informar ao usuário.

## Validação

`node scripts/test-default-inbox-triggers.mjs` usa PostgreSQL temporário com contas e dados fictícios. Verifica criação dos quatro padrões para contas novas, preservação das antigas, remoção sem recriação em atualização do cadastro, restrição de execução direta e inclusão idempotente do Google somente no Renato.

No Lovable Cloud, depois de aplicar, criar uma conta sintética pelo fluxo normal e conferir os quatro gatilhos, além de perfil, acesso de teste e funis. Não é necessário enviar mensagens reais nem reconectar o WhatsApp para esta verificação. Apagar a conta sintética ao final. Não republicar funções de WhatsApp para esta alteração.
