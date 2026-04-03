

## Plano: Melhorar Agenda + Remover sugestões do modal de Serviços

### 1. Modal de Serviços — remover chips de sugestão

Remover o array `SUGGESTION_CHIPS` e todo o bloco de chips do `ServiceModal.tsx`. O campo "Nome do serviço" continua como input livre.

**Arquivo:** `src/components/ServiceModal.tsx`

---

### 2. Agenda — campo "Tipo" livre (digitável pelo usuário)

Atualmente o tipo do evento é um `<select>` com 3 opções fixas (Evento, Follow-up, Reunião). Vamos trocar por um **input de texto livre** onde o fotógrafo digita o que quiser (ex: "Casamento", "Ensaio Pré-Wedding", "Visita Técnica").

- Trocar o `<select>` por um `<Input>` com placeholder "Ex: Casamento, Reunião..."
- Manter o campo como opcional — se não preencher, salva como "Evento" por padrão
- Adicionar campo **Local do evento** (input texto, opcional) ao modal, referenciando a imagem enviada
- Adicionar campo **Data** com DatePicker no modal (atualmente usa apenas a data selecionada no calendário, o que pode ser confuso)

**Arquivos:** `src/pages/AgendaPage.tsx`

---

### 3. Exibir local e excluir eventos na listagem lateral

- Mostrar o local do evento (se preenchido) no card do evento na listagem da data selecionada
- Adicionar botão de excluir evento (já existe `useDeleteEvent` no hook)

**Arquivo:** `src/pages/AgendaPage.tsx`

---

### 4. Migration — adicionar coluna `local` na tabela events

```sql
ALTER TABLE public.events ADD COLUMN local text;
```

---

### Resumo de arquivos

| Arquivo | Ação |
|---|---|
| `src/components/ServiceModal.tsx` | Remover SUGGESTION_CHIPS e bloco de chips |
| `src/pages/AgendaPage.tsx` | Tipo livre, campo local, date picker, botão excluir |
| Migration SQL | Adicionar coluna `local` |

