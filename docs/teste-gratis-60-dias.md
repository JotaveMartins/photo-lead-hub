# Teste grátis de 60 dias e contratação assistida

## Fluxo do cliente

- `/cadastro`: cadastro público com nome, e-mail e senha. Sem cartão e sem gateway.
- A confirmação do e-mail inicia o teste, pelo relógio do banco, por 60 dias.
  Quando o serviço de autenticação confirma e-mails automaticamente, o teste
  começa na criação confirmada da conta.
- O topo do CRM informa os dias restantes, arredondando para cima. A situação é
  consultada no servidor a cada 30 segundos e ao retornar à janela.
- Ao vencer, as páginas privadas direcionam para `/assinatura`. A pessoa consegue
  entrar na conta e falar com a equipe, mas o prazo não é renovado pelo login.
- A tela apresenta R$ 300 pelo período completo de 6 meses e R$ 500 por 1 ano.
  Os botões abrem o WhatsApp `(61) 3306-1009`, com o número internacional exato
  `556133061009`. Nenhuma cobrança ou mensagem é enviada automaticamente.
- O vencimento não apaga dados. Contas anteriores à migração mantêm o acesso
  anterior; o bloqueio administrativo continua prevalecendo.

Os recursos por perfil e a permissão separada do Estúdio IA permanecem como já
estavam. Esta entrega não modifica gateway, cobrança dos clientes dos fotógrafos,
preços dos serviços, nem cria recorrência ou renovação automática de planos.

## Administração

A aba **Admin > Acessos e testes** mostra contas em teste, vencidas, bloqueadas,
com plano ativo, aguardando confirmação e com acesso anterior mantido.

O administrador pode:

- Acrescentar de 1 a 60 dias a um teste iniciado. Se já venceu, a extensão parte
  de agora; caso contrário, parte do término atual.
- Liberar 6 meses ou 1 ano após combinar a contratação fora do CRM. Em uma
  renovação de plano ainda ativo, o período é somado ao término existente.
- Registrar uma observação. O banco guarda quem alterou, quando, a ação e o estado
  anterior e posterior em `crm_access_audit`.

Liberar um plano não comprova recebimento e não remove bloqueio manual. Use o
controle já existente na aba Clientes para revisar bloqueios. Não se altera
período de administrador, que mantém acesso administrativo.

## Autoridade e proteção

`crm_account_access` não é editável pelo cliente. O teste é inicializado por
trigger em `auth.users`, na confirmação do cadastro, e não pode ser reiniciado
confirmando o e-mail novamente. As mudanças de prazo passam por RPCs com
verificação de administrador e auditoria transacional.

A migração adiciona políticas restritivas às tabelas de aplicação que já possuem
RLS e ao Storage autenticado, preservando as políticas de propriedade existentes.
Também protege mutações feitas por RPCs privilegiadas sob uma sessão de cliente.
Perfis, papéis, configuração administrativa e informações de acesso permanecem
fora desse bloqueio para permitir autenticação, consulta da situação e suporte.
Usuários não podem alterar campos administrativos de permissão do perfil.

As funções alteradas consultam a validade no servidor antes de operações privadas
ou serviços externos. Falha na consulta não concede acesso. Mensagens recebidas
por webhooks e links públicos de galerias continuam seguindo seu fluxo próprio:
a expiração do acesso ao painel não apaga registros recebidos nem revoga URLs
públicas ou URLs assinadas que já existam. Operações de envio, IA e sincronizações
alteradas nesta entrega deixam de executar para contas vencidas.

Esta é uma gestão de prazo sem gateway. Não implementa cobrança automática,
recibos, identificação automática de pagamentos, recuperação de senha nova,
limites de consumo por plano ou uma revisão completa de segurança de todos os
endpoints legados do produto.

## Implantação no Lovable Cloud

Aplicar nesta ordem, antes de publicar o frontend para os clientes:

1. Aplicar `supabase/migrations/20261103120000_crm_trial_access.sql`. A migração
   registra as contas existentes como acesso anterior mantido e habilita o teste
   para novos cadastros. Não atribui vencimento aos clientes atuais.
2. Publicar todas as funções abaixo com o módulo compartilhado
   `supabase/functions/_shared/account-access.ts`:
   - `ai-reply`
   - `analyze-inbox-service`
   - `asaas-create-charge`
   - `gallery-storage`
   - `generate-carousel-caption`
   - `google-calendar-auth-start`
   - `google-calendar-sync`
   - `instagram-auth-start`
   - `manage-evolution`
   - `publish-instagram-carousel`
   - `send-whatsapp-message`
   - `sync-inbox-messages`
   - `sync-meta-ads`
   - `test-ai-connection`
   - `test-instagram-connection`
3. Validar que o cadastro público está habilitado, que os e-mails de confirmação
   chegam e que a URL de redirecionamento de autenticação inclui o domínio usado.
4. Na prévia, cadastrar uma conta de teste, confirmar o e-mail e conferir 60 dias
   no topo. Pelo administrador, validar extensão e liberação de planos; verificar
   separadamente uma conta vencida e uma conta antiga. Publicar o frontend após
   essa validação.

Não é necessário agendador para expirar o teste: as verificações usam `now()` no
banco em cada operação. Não é necessário cadastrar credenciais de pagamento.

## Validação local realizada

O cenário PostgreSQL local cobriu preservação das contas antigas, 60 dias exatos
na confirmação, impossibilidade de reiniciar o prazo, negação de autoextensão,
bloqueio de leitura/escrita/Storage após expiração, mutações por função privilegiada,
extensão administrativa, liberação e renovação semestral/anual, precedência do
bloqueio manual e auditoria. Foram usados apenas registros sintéticos.

A suíte de frontend cobre contador, singular no último dia, redirecionamento de
conta vencida, falha de verificação sem liberação indevida, preços totais, número
de contato, administração e confirmação de cadastro. Os testes de funções cobrem
negação de análise por IA a contas vencidas, sem ler históricos ou chamar provedor.
A implantação, os e-mails e as integrações reais precisam de validação no Cloud.
