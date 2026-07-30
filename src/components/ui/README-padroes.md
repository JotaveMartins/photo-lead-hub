# Padrões de UI do CRM

Toda tela/feature nova DEVE usar estes componentes. Não criar variações novas.

| Elemento | Componente obrigatório |
| --- | --- |
| Dropdown de seleção | `@/components/SearchSelect` |
| Seleção de cliente | `@/components/ClienteSearchSelect` |
| Campo de data | `@/components/DatePickerField` |
| Campo de hora | `@/components/TimePickerField` |
| Barra de pesquisa | `@/components/ui/search-input` (`SearchInput`) |
| Modal | `@/components/ui/dialog` |
| Painel lateral | `@/components/ui/sheet` |
| Feedback | `toast` (sonner) + loading desabilitando o botão |

Proibido em telas novas: `<select>` nativo em formulários, `<input type="date">`,
dropdowns customizados novos, barras de busca improvisadas e cores fixas
(`text-white`, `bg-black`, `bg-[#...]`) — usar sempre tokens semânticos.

`<select>` nativo permanece aceitável apenas em filtros simples de tabela já existentes.

## Exemplos

```tsx
<SearchSelect
  label="Serviço"
  options={services.map((s) => ({ value: s.id, label: s.nome }))}
  value={serviceId}
  onChange={setServiceId}
  placeholder="Sem serviço"
  emptyLabel="Sem serviço"
/>

<ClienteSearchSelect clientes={clientes} value={clienteId} onChange={setClienteId} />

<DatePickerField value={dataEnsaio} onChange={setDataEnsaio} placeholder="Data do ensaio" />

<SearchInput value={search} onValueChange={setSearch} placeholder="Buscar..." />
```