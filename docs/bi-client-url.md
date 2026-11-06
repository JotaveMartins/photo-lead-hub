# BI Avanzo: acesso direto à empresa

`bi-whatsapp-leads` mantém o POST autenticado por `x-api-key`/`CRM_API_KEY` e
acrescenta `client_url: string | null` em cada entrada de `accounts`. Os campos
`in_crm`, `whatsapp_connected` e `leads` mantêm seu significado.

O vínculo é o já existente `profiles.meta_ad_account_id`, com ou sem `act_`.
As chaves da resposta são normalizadas sem esse prefixo. O destino é calculado
antes das consultas de WhatsApp e leads: desconexão e ausência de leads não o
removem. Sem vínculo ou com mais de um `user_id` distinto, retorna null. Todas as
páginas de perfis são lidas para não confundir resultado truncado com vínculo único.

## Rota e autorização

`https://crm.avanzodigital.com.br/admin/clientes/<profiles.user_id>`

Essa rota faz parte do roteador do CRM e usa a mesma seleção administrativa de
conta do botão Acessar em AdminPage. Confere sessão e papel de administrador,
consulta somente `user_id, nome` do perfil existente, inicia a impersonação e abre
`/leads`. O contexto escolhido permanece na navegação pelo CRM. Não é a rota
`/clientes/:id`, que representa clientes cadastrados pelo fotógrafo, outra entidade.

Sem sessão, o destino é preservado no estado da navegação até o login. O formulário
aceita apenas a rota administrativa com UUID como retorno, recusando URLs externas.
Usuários sem papel de administrador recebem acesso restrito. O link não concede
permissão nem autentica ninguém. As regras RLS existentes permanecem intactas.
O parâmetro é apenas o identificador da empresa: não contém tokens ou credenciais.
Nenhuma empresa, perfil ou lead é criado durante consulta ou navegação.

## Disponibilização no Lovable Cloud

1. Sincronizar main, testar na prévia e publicar o frontend com a nova rota e o
   retorno de login. Fazer isso antes de ativar o campo na função para evitar
   habilitar no BI links para um frontend ainda sem essa rota.
2. Republicar **bi-whatsapp-leads**. A configuração existente `verify_jwt = false`
   permanece, pois o endpoint valida sua chave `CRM_API_KEY` explicitamente.
   Não alterar nem divulgar a chave. Não há migração de banco.
3. Fazer o POST com o segredo já configurado no BI. Validar conta vinculada,
   conta sem leads e com WhatsApp desconectado, conta sem vínculo e ambiguidade.
4. Abrir o link logado como admin e também em janela sem sessão. Após login
   administrativo, deve abrir os Leads da empresa correta. Uma conta sem papel
   de administrador deve ser recusada. Confirmar que o BI habilita o botão.

Os testes locais usam mocks e contas fictícias, sem chamadas ao Cloud ou leitura
de clientes. Publicação e validação com o BI real precisam ocorrer no Lovable,
pois este ambiente não dispõe de acesso de implantação ao Cloud.

## Testes

`npx vitest run src/test/biClientLink.test.tsx --maxWorkers=2`

Cobre URL oficial, normalização, ausência de leads/desconexão, campos anteriores,
vínculo ausente/ambíguo/duplicado, paginação, autenticação da API, erro de consulta,
retorno seguro após login, seleção administrativa, negação sem papel e perfil
inexistente. Rodar também `npm test -- --maxWorkers=2`, checagem TypeScript e build.
