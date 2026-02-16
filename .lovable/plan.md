
# Painel de Administrador - Gerenciamento de Clientes

## Resumo
Criar um sistema de roles (admin/user) e um painel exclusivo para o administrador, onde ele pode criar contas de clientes com senha aleatória gerada automaticamente.

## Como vai funcionar

1. **Você (avanzosolucoesdigitais@gmail.com) sera o admin** - Ao fazer login, verá um item extra no menu lateral: "Clientes"
2. **Na pagina Clientes**, você podera:
   - Ver a lista de todos os clientes cadastrados (nome, email, data de criacao)
   - Criar um novo cliente informando nome e email
   - Uma senha aleatoria de 8 caracteres sera gerada automaticamente
   - A senha sera exibida na tela para voce copiar e enviar ao cliente
3. **Clientes normais** continuam acessando normalmente suas paginas de Leads e Tarefas, sem ver o menu "Clientes"

## Detalhes Tecnicos

### 1. Banco de Dados - Tabela de Roles
Seguindo as boas praticas de seguranca, criar uma tabela separada `user_roles`:

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

Funcao `has_role` (SECURITY DEFINER) para checar roles sem recursao:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

Politicas RLS na `user_roles`:
- SELECT: usuario ve apenas seu proprio role
- INSERT/UPDATE/DELETE: somente admins

Inserir o role admin para a conta `avanzosolucoesdigitais@gmail.com`:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('c8efc0bc-3370-49fc-b9f3-2166f782fe65', 'admin');
```

### 2. Edge Function - `create-user`
Uma funcao backend que:
- Valida que quem esta chamando e admin (via `has_role`)
- Recebe `nome` e `email`
- Gera uma senha aleatoria de 8 caracteres
- Usa o Supabase Admin API (`service_role_key`) para criar o usuario via `supabase.auth.admin.createUser()`
- Retorna a senha gerada para o admin copiar

### 3. Frontend

**Hook `useUserRole`**: consulta a tabela `user_roles` para saber se o usuario logado e admin.

**Sidebar atualizado**: se o usuario for admin, exibe o item "Clientes" no menu.

**Pagina `AdminPage.tsx`**:
- Tabela listando todos os profiles (somente admin pode ver todos)
- Botao "Novo Cliente" que abre um modal
- Modal com campos Nome e Email
- Ao criar, exibe a senha gerada em um dialogo para o admin copiar
- Botao de copiar senha para a area de transferencia

**Rota `/admin`**: protegida, so acessivel para admins.

### 4. Ajustes de RLS na tabela `profiles`
Adicionar politica para que admins possam ler todos os perfis (para listar clientes).

### Arquivos que serao criados/modificados

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar tabela `user_roles`, funcao `has_role`, seed admin, RLS |
| `supabase/functions/create-user/index.ts` | Edge function para criar usuarios |
| `supabase/config.toml` | Configurar `verify_jwt = false` para a edge function |
| `src/hooks/useUserRole.ts` | Hook para consultar role do usuario |
| `src/hooks/useAdminUsers.ts` | Hook para listar e criar usuarios (admin) |
| `src/pages/AdminPage.tsx` | Pagina de gerenciamento de clientes |
| `src/components/CreateUserModal.tsx` | Modal de criacao de cliente |
| `src/components/Sidebar.tsx` | Adicionar item "Clientes" condicional |
| `src/App.tsx` | Adicionar rota `/admin` |
