# Corrigir envio do lead com número sem código do país

## Causa raiz
No `LeadConversation.handleSend`, o número é obtido apenas com `replace(/\D/g, "")`. Quando o lead foi salvo como `(61) 3306-1009`, isso gera `6133061009` — sem o `55`. A Evolution API faz lookup desse JID, não acha (`"exists":false`) e retorna 400.

Conversas vindas do inbox não têm esse problema porque o `contact_number` já chega da Evolution com DDI.

## Mudanças

### 1. `src/lib/utils.ts`
Adicionar helper `normalizeBrazilWhatsapp(raw: string): string`:
- Remove tudo que não é dígito.
- Se já começa com `55` e tem 12–13 dígitos → retorna como está.
- Se tem 10 ou 11 dígitos (DDD + número) → prefixa `55`.
- Caso contrário (já internacional com outro DDI, ou inválido) → retorna os dígitos crus, deixando a Evolution responder.

Não tentar adicionar/remover o 9º dígito automaticamente — isso é decisão de negócio e pode quebrar números válidos. Fica como follow-up se o usuário quiser.

### 2. `src/components/LeadConversation.tsx`
- Importar `normalizeBrazilWhatsapp`.
- Em `handleSend`, trocar:
  ```ts
  const number = (conv?.contact_number || leadWhatsapp || "").replace(/\D/g, "");
  ```
  por:
  ```ts
  const number = normalizeBrazilWhatsapp(conv?.contact_number || leadWhatsapp || "");
  ```
- Aplicar a mesma normalização no `normalizedPhone` da busca de conversa (assim, ao reaproveitar a conversa já existente para o lead, o match continua funcionando mesmo se o `contact_number` salvo tiver vindo com formatos diferentes).

### 3. Mensagem de erro mais clara
Quando a Evolution responder com `exists:false`, mostrar um toast amigável tipo:
> "Esse número não está no WhatsApp (verifique DDD/DDI ou se é um número Business)."

Detecção: no `catch`, se a mensagem inclui `"exists":false`, sobrescrever o toast.

## Fora de escopo
- Não vou mexer no `evolution-webhook` nem na criação de leads — esses fluxos já recebem o número com DDI.
- Não vou alterar leads existentes no banco; a normalização acontece só na hora do envio.
- Lógica de 9º dígito de celular fica para um próximo passo, se desejado.
