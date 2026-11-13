# Falha ao criar cliente no administrador

O formulário usa a função **create-user**, não create-user-api. O frontend antes descartava o JSON da resposta em caso de erro HTTP e exibia apenas “Edge Function returned a non-2xx status code”. Agora lê `error.context` e mostra `error`/`message` da resposta. A sessão inválida recebe orientação para novo login. Nenhuma regra de autenticação foi alterada.

Esta alteração melhora o diagnóstico; não confirma nem corrige por si só uma falha do servidor. Sem os logs do Lovable Cloud, não é possível identificar a causa da tentativa real.

## Conferência no Lovable Cloud

1. Sincronizar a main. Localizar a tentativa no histórico da Edge Function `create-user` e no serviço Auth pelo e-mail informado pelo usuário. Guardar status HTTP, código do Auth e mensagem do erro, sem tokens, senhas ou corpos com credenciais.
2. Conferir primeiro, somente por leitura, se o e-mail já existe em `auth.users` e se possui perfil em `public.profiles`. Se existir, não recriar, excluir nem alterar senha automaticamente. Verificar também se a execução original falhou depois de criar a conta.
3. Se a resposta for `Invalid JWT`/401, diferenciar rejeição do gateway de rejeição dentro da função. Conferir sessão e configuração de verificação de JWT da função implantada; não desativar a autenticação nem as verificações de administrador para contornar o erro.
4. Se o Auth indicar `Database error saving new user`, consultar os logs PostgreSQL do mesmo horário para obter o nome da função/trigger/constraint. Conferir os gatilhos de perfil, funil, acesso de teste e palavras-chave do Inbox. Não remover os gatilhos nem alterar os clientes existentes para diagnosticar.
5. Caso seja necessária correção do banco/backend, corrigir a causa comprovada e validar com uma conta sintética. Conferir criação de usuário, perfil, papel user, plano solicitado, acesso de teste e quatro gatilhos do Inbox. Apagar somente a conta sintética. Não testar repetindo a criação do cliente real sem primeiro conferir sua existência.
6. Informar a causa e a correção. Não republicar funções de WhatsApp: não fazem parte deste fluxo.

Os testes locais da melhoria de erro cobrem e-mail já registrado, JWT inválido, falha de banco, resposta não JSON e erro de transporte. Os 21 testes isolados dos gatilhos padrão também passaram; isso não prova o estado atual do banco implantado.
