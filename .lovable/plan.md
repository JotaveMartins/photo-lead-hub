# Corrigir slide "Duas fotos" na exportação

## O problema (confirmado no código)

O layout `grid_2` é desenhado de forma diferente no editor e na exportação:

- Editor (`src/components/studio/CarouselSlide.tsx`): duas fotos lado a lado (2 colunas).
- Exportação (`src/lib/carouselExport.ts`): duas fotos empilhadas (2 linhas).

Por isso o slide 6 aparece correto na tela e sai errado no download. Os demais layouts (`single_full`, `single_frame`, `grid_4`, `editorial_2`) já coincidem entre editor e exportação — por isso só esse saiu diferente.

## A correção

Alterar os retângulos do `grid_2` na exportação para duas colunas de largura igual e altura total:

```text
antes (export)        depois (export = editor)
+-----------+          +-----+-----+
|     A     |          |     |     |
+-----------+   -->    |  A  |  B  |
|     B     |          |     |     |
+-----------+          +-----+-----+
```

Também alinhar o valor do espaçamento entre fotos para ficar visualmente igual ao da interface.

## Verificação

Regerar o download do carrossel aprovado e comparar slide a slide com a interface, confirmando que o slide 6 sai com as duas fotos lado a lado e que os outros continuam corretos.