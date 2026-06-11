## Objetivo

Quando o usuário tentar desativar a IA (na página de IA) e ainda houver leads em "Triagem Feita", mostrar um popup pedindo confirmação para mover esses leads para "Contato Iniciado". Sem isso, a coluna sumiria do Kanban e os leads ficariam invisíveis.

## Comportamento

1. Usuário desliga um dos toggles na página de IA:
   - "IA sempre ativa" (`is_active`)
   - "IA por gatilho" (`ai_trigger_enabled`)
2. Antes de salvar, o sistema verifica:
   - Se **após** essa mudança ambos ficariam desligados (ou seja, a coluna "Triagem Feita" sumiria), **e**
   - Existem leads com `status = 'Triagem Feita'` (e `deleted_at IS NULL`) do usuário.
3. Se sim, abre um **AlertDialog** com:
   - Título: "Mover leads da Triagem Feita?"
   - Texto: "Você tem **N leads** em 'Triagem Feita'. Como a IA será desativada, essa etapa deixará de aparecer no Kanban. Deseja mover esses leads para 'Contato Iniciado'?"
   - Botões:
     - **Cancelar**: aborta, mantém IA ativa, nenhum lead alterado.
     - **Mover e desativar**: move todos para "Contato Iniciado", registra no `lead_history` ("Movido automaticamente da Triagem Feita ao desativar a IA") e então salva a config da IA.
4. Se não houver leads em Triagem Feita, salva direto sem popup.

## Detalhes técnicos

- **Arquivo:** `src/pages/IAPage.tsx` (no fluxo de salvar / `onCheckedChange` dos switches `is_active` e `ai_trigger_enabled`).
- Interceptar o `handleSave` (ou o ponto onde o toggle é persistido) para rodar a checagem antes do `upsert` em `ai_config`.
- Query: `supabase.from('leads').select('id', { count: 'exact' }).eq('user_id', effectiveUserId).eq('status', 'Triagem Feita').is('deleted_at', null)`.
- Mutação em massa: `update leads set status = 'Contato Iniciado' where ...` + insert no `lead_history` para cada lead (ou um único registro agrupado se preferir performance).
- Usar `useEffectiveUserId` para respeitar impersonação.
- Toast de sucesso: "N leads movidos para Contato Iniciado".
- Estado de loading durante a operação para desabilitar os botões do dialog.

## O que NÃO muda

- O drawer do lead continua mostrando "Triagem Feita" no seletor quando o lead já está nessa etapa (fallback que já existe).
- Nada nas edge functions, na migração ou no Kanban precisa mudar.
