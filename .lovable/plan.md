## Mudanças a implementar

### 1. Emoji picker fechando ao passar mouse na divisória
**Arquivo:** `src/components/chat/EmojiPickerButton.tsx`

O `PopoverContent` do shadcn fecha em `pointer-down-outside` / `focus-outside`, mas o `EmojiPicker` (lib `emoji-picker-react`) tem áreas internas (separadores entre categorias, scrollbar) que disparam o blur do popover, fazendo-o fechar quando o mouse passa sobre a linha divisória entre seções.

Solução: bloquear os handlers de auto-close do Radix dentro do conteúdo do popover:
```tsx
<PopoverContent
  onPointerDownOutside={(e) => {
    // Permite fechar se for clique fora do picker; já é o default.
  }}
  onInteractOutside={(e) => {
    const target = e.target as HTMLElement;
    if (target.closest(".EmojiPickerReact")) e.preventDefault();
  }}
  onFocusOutside={(e) => e.preventDefault()}
  ...
>
```
Garantir também que o popover só feche em clique fora real ou na seleção de emoji.

---

### 2. Divisória de data no meio das conversas (estilo WhatsApp)
**Arquivos:** `src/components/LeadConversation.tsx`, `src/pages/InboxPage.tsx`

Hoje cada mensagem renderiza só a hora (`formatMsgDate`). Vamos inserir um chip centralizado ("Hoje", "Ontem", "22 jun 2026") sempre que a data da mensagem mudar em relação à anterior.

Criar helper `src/lib/formatMessageDay.ts`:
- recebe timestamp
- retorna `"Hoje"`, `"Ontem"`, ou `"DD MMM YYYY"` em PT-BR usando `parseLocalDate`/timezone America/Sao_Paulo (conforme a regra do projeto).

No `.map(displayedMessages)` dos dois arquivos, antes de cada mensagem, comparar o dia local com a anterior e, se diferente, renderizar:
```tsx
<div className="flex justify-center my-3">
  <span className="text-[11px] px-3 py-1 rounded-full bg-muted/60 text-muted-foreground">
    {label}
  </span>
</div>
```

---

### 3. Botão "Ativar Sequência de Follow-up" só na etapa Follow-up
**Arquivo:** `src/components/LeadDetailDrawer.tsx` (linha 777)

Hoje a condição inclui `"Novo Lead"`. Remover para que o botão apareça apenas quando `lead.status === "Follow-up"`:
```tsx
{lead.status === "Follow-up" && pendingTasks.filter(...).length === 0 && (...)}
```

---

### 4. Leads criados pelo Inbox Trigger → origem "Tráfego Pago"
**Arquivo:** `supabase/functions/evolution-webhook/index.ts` (linha ~607)

Na inserção do lead disparada pelo trigger de keyword, trocar:
```ts
origem: "WhatsApp",
```
por:
```ts
origem: "Tráfego Pago",
```
(O bloco fica isolado a esse caminho — leads criados manualmente ou via outras rotas mantêm seu fluxo.)

Verificar se "Tráfego Pago" já existe como opção de origem no sistema; se houver lista fixa, garantir a string idêntica. Não fazer migration de dados retroativa — afeta só novos leads.

---

### 5. Botão "Pausar IA" só aparece se IA global estiver ativa
**Arquivo:** `src/components/LeadDetailDrawer.tsx` (linhas 761-776)

Hoje o botão Pausar/Retomar IA aparece sempre. Vamos:
1. Buscar `ai_config.is_active` do usuário (via hook novo `useAIConfig` ou query inline com React Query em `useEffectiveUserId`).
2. Renderizar o bloco inteiro `<div className="ml-auto">...Pausar IA...</div>` apenas quando `aiConfig?.is_active === true`.
3. Quando `is_active` for `false`, ocultar tanto o badge "IA Pausada" quanto os botões, porque a IA já está desligada globalmente e o controle perde sentido.

---

## Detalhes técnicos

- **Emoji picker:** `onInteractOutside` do Radix dispara para qualquer pointer-down fora do `PopoverContent`. O bug atual é dentro do próprio popover (categoria/scroll trigger blur). Vamos verificar se basta `modal={false}` + manter `setOpen(false)` só no `onEmojiClick`, ou se precisa do `onInteractOutside` guard. Testar ambos.
- **Date dividers:** usar `toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })` para a chave de comparação dia-a-dia, evitando bug de fuso.
- **ai_config query:** a tabela já é lida pelo `IAPage`. Criar hook `useAIConfig` em `src/hooks/useAIConfig.ts` reutilizável (cacheia por `effectiveUserId`).
- **Origem trigger:** confirmar que a constraint/enum de `leads.origem` aceita `"Tráfego Pago"` (já usada no projeto conforme grep em `RelatoriosPage`, `MetaAdsSection`).