# Webhook de desconexão do WhatsApp

Quando uma instância de WhatsApp cair, o CRM dispara automaticamente um webhook para o fluxo do n8n, que notifica seu colaborador.

## Como vai funcionar

1. A Evolution API avisa o CRM sempre que o estado da conexão muda (isso já acontece hoje e é o que atualiza o status para "desconectado").
2. Quando a mudança for de conectado para desconectado, o CRM envia um POST para o seu fluxo do n8n.
3. Só dispara na transição para desconectado — se a instância já estava desconectada e chega outro aviso, nada é enviado (evita spam).

## Conteúdo enviado

```json
{
  "event": "whatsapp_disconnected",
  "account_name": "Saulo Oliveira",
  "instance_name": "saulo-01",
  "message": "A instância \"saulo-01\" da conta Saulo Oliveira foi desconectada do WhatsApp.",
  "disconnected_at": "2026-08-04T14:47:00.000Z"
}
```

O nome da conta vem do cadastro do dono da instância no CRM.

## Detalhes técnicos

- URL de destino guardada como segredo `WHATSAPP_DISCONNECT_WEBHOOK_URL` (valor: o endpoint n8n informado). Se o segredo não existir, o disparo é apenas ignorado, sem quebrar o webhook.
- Alteração em `supabase/functions/evolution-webhook/index.ts`, no bloco `connection.update`: ler o status atual da instância antes do update, e só disparar quando o novo estado não for `open` e o anterior era `connected`. Buscar o `nome` em `profiles` pelo `user_id` da instância.
- Envio com `fetch` não bloqueante (erros apenas logados) para não atrasar a resposta ao provedor.
- Versão do CRM: 3.2.5.
