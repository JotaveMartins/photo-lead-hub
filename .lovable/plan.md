## Diagnóstico

Encontrei o motivo de ainda não sincronizar na conta `martinsdo.ads@gmail.com`:

- O lead criado está com WhatsApp `61993146687`.
- A Evolution está entregando a mensagem recebida como `556193146687`.
- Ou seja: o WhatsApp/Evolution removeu o 9º dígito depois do DDD (`61 99314-6687` virou `55 61 9314-6687`).
- Como a regra atual ficou em “match exato pelos últimos 10-11 dígitos”, esses dois valores não casam.
- Além disso, o chat aberto pelo lead criou uma conversa sem `instance_id`, enquanto o inbox cria outra conversa com `instance_id`; por isso ficaram dois `conversation_id` diferentes.
- O chat do lead também prioriza uma conversa já vinculada mesmo se ela estiver `closed`, então ele continua usando o histórico antigo fechado em vez da conversa nova do inbox.

## Plano de correção

1. **Criar uma regra única de identidade WhatsApp**
   - Manter o match exato como principal.
   - Adicionar apenas um fallback controlado para Brasil: comparar também a versão com/sem o 9º dígito depois do DDD.
   - Isso cobre exatamente o caso real encontrado: `61993146687` ↔ `556193146687`.

2. **Corrigir o webhook de entrada**
   - Ao receber mensagem, antes de criar conversa nova, procurar conversas existentes do mesmo usuário pelo telefone normalizado, mesmo quando `instance_id` estiver vazio.
   - Se achar conversa do lead, reaproveitar a conversa existente e preencher `instance_id`, `contact_jid`, `contact_lid`, `contact_name` e número real recebido.
   - Se encontrar conversa fechada vinculada ao lead, reabrir/usar essa conversa em vez de duplicar.

3. **Corrigir o chat dentro do lead**
   - Ao abrir a aba “Conversa”, procurar por telefone usando a mesma regra com/sem 9º dígito.
   - Preferir conversa aberta/pending mais recente em vez de conversa fechada antiga.
   - Se encontrar conversa do inbox com o mesmo contato, vincular ao `lead_id` e usar esse `conversation_id`.

4. **Atualizar o envio por dentro do lead**
   - Quando enviar mensagem pelo lead, passar o `jid` salvo na conversa quando existir.
   - Isso evita criar/envia para uma identidade diferente quando o WhatsApp usa `@lid` ou retorna número sem 9.

5. **Adicionar correção no banco para dados já duplicados**
   - Criar/ajustar função de trigger para vincular conversas órfãs ao lead usando a nova regra com/sem 9.
   - Fazer uma limpeza pontual dos registros atuais da conta: mover mensagens das conversas duplicadas desse contato para uma conversa principal vinculada ao lead e fechar/remover as duplicadas vazias, preservando histórico.

## Resultado esperado

Depois disso, mensagens recebidas no inbox e mensagens enviadas por dentro do lead devem aparecer na mesma conversa, mesmo quando a Evolution entregar o telefone como `556193146687` e o lead estiver salvo como `61993146687`.