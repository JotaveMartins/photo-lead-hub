## Objetivo

Definir e documentar um padrão único de componentes de formulário do CRM, salvá-lo na memória do projeto (para valer automaticamente em qualquer feature futura) e aplicar esse padrão retroativamente no funil de Entregas.

## Padrão oficial (o "modelo novo")

| Elemento | Componente obrigatório |
|---|---|
| Dropdown de seleção | `SearchSelect` (`src/components/SearchSelect.tsx`) — trigger estilizado, busca interna, portal com posicionamento automático |
| Seleção de cliente | `ClienteSearchSelect` (`src/components/ClienteSearchSelect.tsx`) — mesmo formato usado em Cobranças (nome + WhatsApp) |
| Campo de data | `DatePickerField` (`src/components/DatePickerField.tsx`) — nunca `<input type="date">` |
| Campo de hora | `TimePickerField` |
| Barra de pesquisa | `SearchInput` (`src/components/ui/search-input.tsx`) — nunca `Input` + ícone manual |
| Modal | `Dialog` / Drawer lateral com `Sheet` |
| Feedback | `toast` (sonner) + estado de loading desabilitando o botão |
| Cores | apenas tokens semânticos (`bg-muted`, `border-border`, `text-foreground`) |

Proibidos em novas telas: `<select>` nativo, `<input type="date">`, dropdowns customizados novos, barras de busca improvisadas, cores fixas.

## Etapas

1. **Registrar o padrão na memória do projeto** (`mem://tech/ui-component-standards` + linha no Core do índice), de forma que toda feature nova já nasça com esses componentes sem precisar ser pedido. Atualizar também a memória `UI Constraints` existente para não conflitar (a regra antiga de "sempre `<select>` nativo" passa a ser: `<select>` nativo somente em filtros simples de tabela já existentes; formulários usam `SearchSelect`).

2. **Criar o guia em código** `src/components/ui/README-padroes.md` — referência curta com a tabela acima e exemplos de uso, para consulta rápida.

3. **Corrigir o funil de Entregas** (`src/components/entregas/EntregaDrawer.tsx`):
   - Etapa e Serviço → `SearchSelect`
   - Cliente → `ClienteSearchSelect` (idêntico ao de Cobranças)
   - As 4 datas (ensaio, prévia, entrega prevista, entrega final) → `DatePickerField`
   - Manter layout, validações e comportamento de salvar/excluir

4. **Auditoria rápida das telas do mesmo funil**: conferir `EntregasPage.tsx` (já usa `SearchInput`, apenas validar) e o card de Entregas em `ClienteDetailPage.tsx`.

5. Subir versão para **3.2.0** (mudança estrutural de padrão) em `src/lib/version.ts`.

## Fora do escopo (posso fazer depois, se quiser)

Migrar os `<select>` nativos que ainda existem em `LeadModal`, `NovoClienteModal`, `EditClienteModal`, `ContratoInfoModal`, `RequiredFieldsModal`, `EditCobrancaModal`, `TarefasPage` e `AnunciosPage`. Faz sentido fazer isso em uma segunda leva, para não misturar com a padronização de Entregas.

## Detalhes técnicos

- `SearchSelect` já resolve portal dentro de `Sheet`/`Dialog` (evita corte e travamento de scroll), então funciona no drawer de Entregas sem ajustes.
- `DatePickerField` trabalha com string `YYYY-MM-DD` e `parseLocalDate`, exatamente o formato já usado pelos campos de `entregas` — a troca é direta, sem mudança no payload nem no banco.
- Nenhuma alteração de schema ou de regra de negócio.
