## 1. Remover "Ver mais campos" do modal de Lead

`src/components/LeadModal.tsx`:
- Remover bloco `showMore`, botão "Ver mais campos", estado `showMore`, estado `dataEntrada` e o select de Status que estava lá dentro (já existe outro Status visível na edição).
- Tirar `data_entrada_novo_lead` do `leadData` enviado ao backend (a trigger do banco já preenche automaticamente).
- Remover imports não usados (`ChevronDown`, `ChevronRight`).

## 2. Padronizar todos os date pickers

Trocar `<Input type="date" />` pelo `DatePickerField` em:
- `src/components/ContratoInfoModal.tsx` (linha ~173)
- `src/components/contratos/ContratoDrawer.tsx` (linha ~227)

Auditar com `rg 'type="date"' src/` depois para garantir zero ocorrências restantes.

## 3. Modernizar o seletor de etapa dentro do Lead

`src/components/LeadDetailDrawer.tsx` (linha ~596): o `<select>` nativo do status fica feio. Vou substituí-lo por um botão customizado (estilo do `ItemSelector` em `NovaCobrancaModal`) com badge colorido por etapa, ainda sem usar Radix portal — respeitando a regra de UI do projeto (memory `tech/ui-input-constraints`). Cada opção mostra o nome da etapa com seu badge, e clicar dispara o mesmo `handleStatusChange` atual.

## 4. Agenda: permitir cadastrar Serviço inline

`src/pages/AgendaPage.tsx` (linha ~606): o `SearchSelect` de serviço não tem atalho para criar. Vou substituir por um seletor inline com botão **"+ Novo serviço"** (mesmo padrão do `ItemSelector` de cobranças, mas só com serviços, sem pacotes — já que o evento da agenda só vincula `service_id`).

Ao clicar em "Novo serviço": abre `ServiceModal`. Quando o serviço é criado:
- O modal de serviço fecha.
- O modal de Novo Evento **permanece aberto**.
- O novo serviço já fica selecionado (`selectedServiceId` recebe o id).

## 5. Bug: criar serviço inline em Cobranças fecha tudo e salva a cobrança

Causa: o `ServiceModal` (e `PackageModal`) renderiza um `<form>` aninhado dentro do `<form>` do `NovaCobrancaModal`. HTML não permite forms aninhados — o submit borbulha pro form pai, criando a cobrança. Além disso, o `Dialog` interno fechando dispara `onOpenChange` no `Dialog` pai por causa do gerenciamento de foco do Radix.

Correção:
- Garantir que `ServiceModal` e `PackageModal` sejam renderizados **fora** do `<form>` pai. Vou movê-los para fora do `<DialogContent>` do `NovaCobrancaModal`, junto ao Dialog raiz, ou usar `React.createPortal` para `document.body`. A solução mais simples e segura: mover esses dois modais para fora do `<form>` (irmãos do Dialog principal), passando `selectedName/onSelect` via props pra um wrapper.
- No `ItemSelector`, o `onCreated` deve apenas chamar `onSelect(nome, valor)` e **não** disparar submit; já está assim, mas validar.
- Verificar que os botões dentro do `ServiceModal` e `PackageModal` têm `type="button"` no Cancelar e o Salvar é `type="submit"` do form interno (que não vai mais ser aninhado).

Vou checar `ServiceModal.tsx` e `PackageModal.tsx` para confirmar o `<form>` interno e atributos `type` dos botões.

## Ordem de implementação

1. Limpar `LeadModal` (item 1).
2. Trocar date inputs nativos (item 2).
3. Refatorar select de etapa no drawer (item 3).
4. Corrigir bug do submit aninhado em Cobranças (item 5) — antes do item 4, porque é o mesmo padrão de inline-add.
5. Implementar inline-add de serviço na Agenda (item 4) já com o padrão corrigido.

## Observações

- Nenhuma mudança de banco.
- Mantém a regra de UI: sem Radix portals em drawers/modais (item 3 usa custom dropdown, não Radix Select).
