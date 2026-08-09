# Estúdio IA — feedback ao Salvar e Aprovar

## O que está acontecendo

Os botões estão funcionando: no banco já existe 1 carrossel salvo com 6 slides e 9 fotos vinculadas, e o projeto atual está com status "Em edição". O problema é de interface — depois de clicar em Salvar ou Aprovar a tela continua exatamente igual, então parece que nada aconteceu.

Pontos que causam essa sensação:

- O status mostrado no cabeçalho e no editor vem do projeto carregado em cache e não é atualizado visualmente de forma perceptível.
- Não há nenhum estado visual de "salvando" nem de "salvo/aprovado" (o botão não muda, não há selo de aprovado).
- Aprovar não muda nada na tela: não bloqueia edição, não mostra selo, não leva de volta para a lista de projetos.
- Como o editor mantém o rascunho local, não fica claro se o que está na tela é o que foi gravado.

## O que fazer

1. **Feedback imediato nos botões**: enquanto salva, mostrar spinner e texto ("Salvando..." / "Aprovando..."); ao terminar, marcar visualmente o sucesso por alguns segundos.
2. **Selo de status ao vivo**: exibir um badge (Rascunho / Em edição / Aprovado) no cabeçalho do projeto e no editor, atualizado logo após a gravação, com cores distintas.
3. **Indicador de alterações não salvas**: mostrar "alterações não salvas" quando o rascunho local diferir do salvo, e limpar esse aviso após salvar.
4. **Fluxo do Aprovar**: após aprovar, mostrar o selo "Aprovado", deixar o editor em modo somente leitura com um botão "Editar novamente", e oferecer voltar para a lista de projetos.
5. **Evitar carrossel duplicado**: garantir que salvos consecutivos atualizem sempre o mesmo carrossel, inclusive logo após o primeiro salvamento.
6. **Lista de projetos coerente**: o status atualizado deve aparecer imediatamente nos cards da tela de projetos.

## Detalhes técnicos

- `src/pages/estudio/ProjetoPage.tsx`: guardar o id do carrossel retornado por `saveCarousel.mutateAsync` em estado local e reutilizá-lo; controlar `dirty` comparando o rascunho com `carousel.slides`/`legenda`; estado `justSaved` para o feedback temporário; redirecionar/oferecer voltar após aprovar.
- `src/components/studio/CarouselEditor.tsx`: props novas (`dirty`, `justSaved`, `readOnly`) para badge de status, spinner nos botões e bloqueio de edição quando aprovado.
- `src/hooks/useStudio.ts`: manter invalidação de `studio-carousel`, `studio-project` e `studio-projects` (já existente) e retornar o id do carrossel salvo para o chamador.
- Sem mudanças de banco de dados.
