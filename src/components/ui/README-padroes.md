# Design System e Padrões de UX do CRM

Fonte de verdade para toda tela/feature nova. Telas antigas não precisam ser refatoradas agora.

> Antes de criar uma nova solução visual, verificar se já existe componente equivalente no projeto. Reutilizar o padrão existente antes de criar um novo.
>
> Se for necessário criar um novo padrão visual, ele deve ser reutilizável e documentado aqui.

## Componentes obrigatórios

| Elemento | Componente |
| --- | --- |
| Header de página | `@/components/ui/page-header` (`PageHeader`) |
| Botões | `@/components/ui/button` |
| Pesquisa | `@/components/ui/search-input` (`SearchInput`) |
| Seleção pesquisável | `@/components/SearchSelect` |
| Seleção múltipla | `@/components/MultiSearchSelect` |
| Cliente | `@/components/ClienteSearchSelect` |
| Serviço em evento da Agenda | `ServiceInlineSelect` (em `AgendaPage`; especializado: busca + preço + "Novo serviço" inline) |
| Serviço/Pacote em cobrança | `@/components/financeiro/CobrancaItemSelector` (especializado: grupos Serviço/Pacote, preço, criação rápida, item arquivado, remover vínculo) |
| Data | `@/components/DatePickerField` |
| Hora | `@/components/TimePickerField` |
| Formulário simples | `@/components/ui/dialog` |
| Detalhes / formulário extenso | `@/components/ui/sheet` |
| Confirmação destrutiva | `@/components/ui/alert-dialog` |
| Confirmação simples (arquivar/excluir) | `@/components/ui/confirm-dialog` (`ConfirmDialog`) |
| Status | `@/components/ui/status-badge` (`StatusBadge`) |
| Estado vazio | `@/components/ui/empty-state` (`EmptyState`) |
| Rodapé de formulário | `@/components/ui/form-actions` (`FormActions`) |
| Feedback | `toast` de `sonner` |
| Ícones | `lucide-react` |

## 1. Header de página
Título + descrição curta à esquerda; ação principal no canto superior direito; secundárias antes dela. Empilha no mobile.
```tsx
<PageHeader title="Contratos" description="Gerencie seus contratos."
  secondaryActions={<Button variant="outline">Exportar</Button>}
  action={<Button><Plus className="h-4 w-4" /> Novo Contrato</Button>} />
```
Rótulos de ação principal: "Novo Lead", "Novo Cliente", "Novo Contrato", "Nova Entrega", "Adicionar cobrança", "Adicionar despesa".

## 2. Botões
- `default` = ação principal (uma por contexto)
- `outline` = secundária
- `ghost` = discreta
- `destructive` = destrutiva

Não criar cores manuais quando uma variante resolver.

## 3. Pesquisa
Sempre `SearchInput`. Não montar `Input` + ícone `Search` manualmente.

## 4. Seletores
`SearchSelect` / `ClienteSearchSelect`. Sem `<select>` nativo em formulários novos (aceito só em filtros antigos já existentes).

## 5. Data e hora
`DatePickerField` / `TimePickerField`. Sem `input type="date|time"`. Datas "YYYY-MM-DD" via `parseLocalDate`.

## 6. Modais
Dialog = formulário simples · Sheet = detalhes ou formulário extenso · AlertDialog = confirmação destrutiva.

## 7. Feedback
Apenas Sonner (`toast.success`, `toast.error`, `toast.info`). Não criar novos sistemas de toast. Botões de mutação ficam `disabled` durante o loading.

## 8. Cores
Somente tokens semânticos: `primary`, `muted`, `destructive`, `status-success`, `status-warning`, `status-danger`, `status-info`, `status-neutral`.
Evitar `green-500`, `blue-500`, `yellow-500`, `red-500`, `orange-500`, `text-white`, `bg-black`, `bg-[#...]` para estados semânticos.

## 9. Status
```tsx
<StatusBadge tone="success">Pago</StatusBadge>   // success | warning | danger | info | neutral
```

## 10. Estados vazios
Ícone + título + descrição curta + CTA quando houver ação natural.
```tsx
<EmptyState icon={FileText} title="Nenhum contrato cadastrado"
  description="Crie o primeiro contrato para começar."
  action={<Button onClick={openNew}>Novo contrato</Button>} />
```

## 11. Checklist CRUD (toda tela de entidade)
Avaliar explicitamente: criar · visualizar · editar · arquivar/excluir · restaurar (soft delete via `deleted_at`) · buscar · filtrar · loading · vazio · erro · mobile.
Nem toda entidade terá tudo, mas a ausência deve ser intencional.

## 12. Exclusão e arquivamento
- Nunca `window.confirm` em código novo; usar `AlertDialog`.
- Arquivar / mover para lixeira: botão `outline` ou `ghost`, texto "Arquivar"/"Mover para lixeira", reversível.
- Exclusão permanente: botão `destructive`, texto explícito "Excluir permanentemente", aviso de que não pode ser desfeito.

## 13. Formulários
Labels acima dos campos (`Label` + campo em `space-y-2`). Obrigatórios com ` *` no label. Mensagens de validação claras abaixo do campo em `text-destructive text-xs`. Rodapé:
```tsx
<FormActions onCancel={onClose} loading={mutation.isPending} submitLabel="Criar" />
```
Conteúdo extra no rodapé (ex.: fluxo Lead Ganho): prop `extra`.

## 14. Mobile
Header empilha; CTA principal sempre visível; tabelas viram cards ou rolam horizontalmente; área de toque mínima 40px (`h-10`); modais com `max-h` e rolagem interna.

## 15. Ícones
Somente Lucide. Botões só com ícone exigem `aria-label` (e `title` ou Tooltip).

## 16. Tipografia e espaçamento
Inter (interface), Plus Jakarta Sans (`font-display`, títulos). Sem fontes novas. Manter `--radius`, `Card`, `border-border` e espaçamentos existentes.

## Como uma feature nova segue este documento
1. Ler esta página antes de começar.
2. Montar a tela com `PageHeader` + componentes da tabela acima.
3. Passar pelo checklist CRUD (seção 11).
4. Se precisar de algo novo, torná-lo reutilizável e documentar aqui.
