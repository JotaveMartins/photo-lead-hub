# Deploy das funções de WhatsApp (manage-evolution e evolution-webhook)

O código das duas funções já está finalizado no projeto — falta apenas publicar no backend:

- `manage-evolution`: conexão de instâncias, QR code, status, desconexão e configuração do webhook.
- `evolution-webhook`: recebimento de mensagens, mídias, resolução de LIDs e o aviso de desconexão para o fluxo do n8n.

## O que será feito

1. Publicar as duas funções diretamente no backend (não precisa de `npx supabase login` / `link` no seu terminal — faço o deploy por aqui, sem token de acesso da CLI).
2. Confirmar que o deploy retornou sucesso para as duas funções.

## Observação

- O aviso de desconexão só dispara de verdade quando o segredo `WHATSAPP_DISCONNECT_WEBHOOK_URL` existir no backend (valor do endpoint do n8n). Sem ele, o deploy funciona normalmente e o disparo é apenas ignorado.
