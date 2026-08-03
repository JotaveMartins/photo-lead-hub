# Entrega: campos obrigatórios e criação rápida de cliente

## O que muda

1. **Campos obrigatórios no drawer de entrega** (Nova/Editar entrega): Título, Etapa e Cliente passam a ser obrigatórios.
   - Asterisco vermelho ao lado dos três rótulos.
   - Botão "Salvar" desabilitado enquanto algum deles estiver vazio, com aviso (toast) caso o envio seja tentado.
   - Remove o preenchimento automático do título como "Entrega" quando vazio.

2. **Criar novo cliente direto no seletor**: dentro da lista suspensa de clientes, um botão fixo "+ Novo cliente" no topo abre o modal de cadastro já existente. Ao salvar, o novo cliente é selecionado automaticamente no campo.

## Detalhes técnicos

- `src/components/entregas/EntregaDrawer.tsx`: validação local (`titulo.trim()`, `etapa`, `clienteId`), `disabled` no botão salvar, marcação visual de obrigatório no Título; passar `required` para `SearchSelect` (Etapa) e `ClienteSearchSelect`.
- `src/components/ClienteSearchSelect.tsx`: nova prop opcional `allowCreate` (padrão ligado) que renderiza o botão "+ Novo cliente" no dropdown e monta `NovoClienteModal` usando o callback `onClienteCreated` já existente para selecionar o cliente recém-criado. Também nova prop `required` para exibir o asterisco. Como o componente é compartilhado (Agenda, Cobranças, Entregas), o comportamento novo fica igual em todos os formulários — padrão desejado.
- `SearchSelect` recebe suporte a `required` para o asterisco no rótulo da Etapa.
- Versão do CRM: 3.2.4.
