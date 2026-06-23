
## Objetivo

Permitir marcar uma conta como **Plano Básico** (cliente pontual). Nessas contas:
- O item de menu **IA** some da sidebar.
- A seção **Meta Ads** dentro da página **Relatórios** não aparece.

A flag pode ser definida na criação do cliente e alterada depois pelo admin.

## Mudanças

### 1. Banco
- Adicionar coluna `plano_basico boolean NOT NULL DEFAULT false` em `public.profiles`.
- Migração via tool de migration (sem alterar grants/políticas existentes).

### 2. Criação do cliente (admin)
- `src/components/CreateUserModal.tsx`: adicionar `<Switch>` "Plano Básico (sem IA e sem Meta Ads)" abaixo dos campos nome/email.
- `src/hooks/useAdminUsers.ts` (`createUser`): aceitar `planoBasico` e repassar à edge function.
- `supabase/functions/create-user/index.ts`: receber `plano_basico` no body e gravar em `profiles.plano_basico` no mesmo update da senha.

### 3. Edição pelo admin
- `src/components/admin/EditAdminUserModal.tsx`: adicionar `<Switch>` "Plano Básico" no topo do form, persistir junto com os outros campos no update de `profiles`.

### 4. Hook compartilhado
- Criar `src/hooks/usePlanoBasico.ts`: query em `profiles.plano_basico` usando `useEffectiveUserId` (respeita impersonation do admin). Retorna `boolean`.

### 5. Esconder menu IA
- `src/components/Sidebar.tsx`: usar `usePlanoBasico()` e filtrar/ocultar o item de navegação que aponta para `/ia` quando `true`.
- `src/App.tsx` (se houver rota `/ia`): manter rota acessível (não bloquear navegação direta), apenas remover do menu — escopo pedido é "menu + seção Meta Ads".

### 6. Esconder seção Meta Ads em Relatórios
- `src/pages/RelatoriosPage.tsx`: condicionar a renderização de `<MetaAdsSection />` a `!planoBasico`. Manter o restante do relatório intacto.

## Fora do escopo (confirmado pelo usuário)
- A página/menu **Anúncios** continua aparecendo.
- Os campos **Meta Ad Account / CPL** no modal admin continuam visíveis.

## Detalhes técnicos

```text
profiles
 └─ plano_basico boolean NOT NULL DEFAULT false   ← nova coluna

CreateUserModal ──> useAdminUsers.createUser({ nome, email, planoBasico })
                         └─> edge fn create-user ──> profiles.update({ senha, plano_basico })

EditAdminUserModal ──> profiles.update({ ..., plano_basico })

usePlanoBasico() ──┬─> Sidebar  (esconde item "IA")
                   └─> RelatoriosPage (esconde MetaAdsSection)
```
