# Limite de fotos por projeto no Estúdio IA

## Objetivo
Limitar o número de fotos por projeto em **30** para evitar sobrecarga no sistema (upload, armazenamento e geração de carrossel/legendas via IA).

## Mudanças

### 1. Constante de limite
- Adicionar `MAX_PHOTOS_PER_PROJECT = 30` em `src/hooks/useStudio.ts` (exportar para reuso).

### 2. Bloqueio no upload (`useUploadPhotos`)
- Antes do loop de upload, somar `startOrder` (que representa quantas fotos já existem) com `files.length`.
- Se exceder `MAX_PHOTOS_PER_PROJECT`, lançar erro com mensagem clara: `"Limite de 30 fotos por projeto atingido."` e não fazer upload de nenhuma foto nova (rejeitar o lote inteiro se ultrapassar).

### 3. Feedback visual no `UploadArea` (`src/components/studio/UploadArea.tsx`)
- Mostrar contador `X / 30 fotos` no subtítulo da área de upload.
- Quando atingir o limite, desabilitar o clique/arraste e exibir aviso "Limite de fotos atingido".

### 4. Ajuste no `ProjetoPage.tsx`
- Passar `photoCount={photos.length}` e `maxPhotos={30}` para o `UploadArea`.
- O `onFiles` já trata o erro via `onError` (toast) — nenhuma mudança extra necessária além de passar os props.

## Escopo
- Apenas frontend + hook de upload. Sem mudanças no banco, storage ou edge functions.
- Projetos existentes com mais de 30 fotos permanecem intactos (apenas bloqueia novos uploads).

## Bump de versão
- Sidebar: 3.4.4 → 3.4.5
