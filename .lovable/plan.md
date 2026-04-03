

## Plano: Módulo de Clientes (sem integração com leads)

### Escopo
Criar a seção de Clientes no CRM: tabela no banco, sidebar, página com cards de resumo, tabela listando clientes, modal de criação/edição e popup pós-criação perguntando se quer criar cobrança.

**Sem** integração automática com leads por enquanto.

### 1. Banco de dados — migration

```sql
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  cpf_cnpj TEXT,
  endereco TEXT,
  origem TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- RLS: mesmo padrão das outras tabelas
CREATE POLICY "Users manage own clientes" ON public.clientes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all clientes" ON public.clientes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar cliente_id na tabela cobrancas
ALTER TABLE public.cobrancas ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;
```

### 2. Sidebar — adicionar "Clientes"

- Novo item `{ id: 'clientes', label: 'Clientes', icon: UserCheck }` após "Agenda" no `baseMenuItems`.
- Visível para todos os usuários.

### 3. Rota

- `App.tsx`: nova rota `/clientes` → `ClientesPage`.
- `DashboardLayout.tsx`: adicionar mapeamento no `getActiveItem` e `handleItemClick`.

### 4. Hook `useClientes`

- `useClientes()` — listar clientes do usuário com busca.
- `useCreateCliente()` — criar cliente.
- `useUpdateCliente()` — editar.
- `useDeleteCliente()` — excluir.
- Segue o padrão do `useCobrancas`.

### 5. Página `ClientesPage`

- **Header**: título "Clientes" + botão "+ Novo Cliente".
- **Cards de resumo**: Total de Clientes, Novos este Mês.
- **Barra de busca** por nome/email/whatsapp.
- **Tabela**: Nome, WhatsApp, Email, Origem, Data de cadastro, Ações (editar/excluir).
- **Estado vazio**: ilustração + botão de cadastrar.

### 6. Modal `NovoClienteModal`

Campos: Nome (obrigatório), WhatsApp, Email, CPF/CNPJ, Endereço, Origem (select com opções como Instagram, Google, Indicação etc.), Observações.

Ao salvar com sucesso → toast de sucesso + popup: **"Deseja criar uma cobrança para este cliente?"** (Sim → navega para `/financeiro/cobrancas` com modal aberto / Não → fecha).

### 7. Modal `EditClienteModal`

Mesmo formulário do NovoClienteModal, pré-preenchido com dados existentes.

### Arquivos novos
- `src/hooks/useClientes.ts`
- `src/pages/ClientesPage.tsx`
- `src/components/clientes/NovoClienteModal.tsx`
- `src/components/clientes/EditClienteModal.tsx`
- `src/components/clientes/ClienteCards.tsx`
- `src/components/clientes/ClienteTable.tsx`

### Arquivos editados
- `src/components/Sidebar.tsx` — novo item
- `src/App.tsx` — nova rota
- `src/components/DashboardLayout.tsx` — mapeamento da rota

