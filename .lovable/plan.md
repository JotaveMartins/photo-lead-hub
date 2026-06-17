## Diagnóstico

Conferi o banco e o webhook:

- Emojis "normais" (🙏🏻☺️, ☺️🙏🏻 etc.) **estão chegando** na conta do Saulo — vários foram salvos hoje em `inbox_messages` com `type=text`.
- Procurei o "😄👍" específico no `webhook_logs` e **não tem registro nenhum** dele. Ou seja, o webhook da Evolution simplesmente não disparou esse evento — não foi a função que descartou.

Olhando o código do `evolution-webhook` (linhas 311-347), existem dois cenários onde uma mensagem que parece "só emoji" some de verdade:

1. **Mensagens temporárias / "ver uma vez"**: chegam embrulhadas em `message.ephemeralMessage.message.*` ou `message.viewOnceMessageV2.message.*`. O webhook só olha o nível raiz, então `content` fica `""` e a bolha aparece em branco (ou nem aparece, no caso de mídia).
2. **Reações** (emoji "long-press" em cima de outra mensagem): vêm como `message.reactionMessage.text` e não caem em nenhum ramo — somem silenciosamente.

Já o caso do "😄👍" do Saulo, como nem entrou no log, foi quase certamente um evento que a Evolution não entregou (instabilidade pontual). Esse cenário é justamente o que o cron de 15min de `sync-inbox-messages` foi feito pra cobrir — mas hoje ele só tenta pelo nome da instância, e para alguns canais a Evolution responde 404 ("instance does not exist"), abortando a sincronização.

## Plano

### 1. `evolution-webhook/index.ts` — desembrulhar containers e tratar reações

Antes do bloco que decide `type`/`content` (linha 311), normalizar a mensagem:

```ts
const realMessage =
  message.ephemeralMessage?.message ??
  message.viewOnceMessage?.message ??
  message.viewOnceMessageV2?.message ??
  message.viewOnceMessageV2Extension?.message ??
  message.documentWithCaptionMessage?.message ??
  message;
```

Trocar todas as leituras `message.conversation`, `message.imageMessage`, etc. desse bloco por `realMessage.*`.

Adicionar um ramo novo logo após `stickerMessage`:

```ts
else if (realMessage.reactionMessage) {
  type = "text";
  const emoji = realMessage.reactionMessage.text || "";
  content = emoji ? `Reagiu: ${emoji}` : "Removeu reação";
}
```

### 2. `sync-inbox-messages/index.ts` — mesmo unwrap + reação

Aplicar a mesma normalização (`realMessage`) e o mesmo handler de `reactionMessage` no ponto equivalente, senão o cron de recuperação continua deixando reações e mensagens efêmeras de fora.

### 3. `sync-inbox-messages/index.ts` — tolerar 404 da Evolution

Quando `findMessages` responde 404 ("instance does not exist"), hoje o erro fica no log e nada mais é feito. Trocar para:

- Log `info` ao invés de `error`.
- Pular a instância silenciosamente e continuar processando as outras.

(Isso não conserta a instância no provider, mas evita poluir log e garante que as demais sincronizam.)

### 4. Deploy

Redeployar `evolution-webhook` e `sync-inbox-messages`.

## O que isso resolve

- Reações por emoji (❤️ 👍 😂…) passam a aparecer como bolha "Reagiu: ❤️".
- Mensagens em chats com "mensagens temporárias" ou "ver uma vez" deixam de chegar em branco.
- O cron de 15min continua firme e cobre o caso "Evolution simplesmente não disparou o webhook" (que foi exatamente o que aconteceu com o 😄👍 do Saulo).

## Fora de escopo

- Renderizar a reação grudada na mensagem original (estilo WhatsApp). Por ora vira uma bolha de texto.
- Mudanças de schema em `inbox_messages`.
