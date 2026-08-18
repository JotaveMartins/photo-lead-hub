# Estúdio IA: orientação das fotos, novos templates e fim das linhas divisórias

## 1. Fotos horizontais nunca em espaços verticais

Cada foto já é salva com a orientação (`landscape`, `portrait`, `square`) no momento do upload, mas o gerador do carrossel ignora isso e sorteia qualquer foto para qualquer espaço.

Mudança: cada espaço (slot) de cada template passa a ter uma forma esperada (alta, larga ou quadrada) e o gerador só coloca ali fotos compatíveis:

- Foto horizontal: só entra em espaços largos (faixas horizontais, moldura, grade 4) ou na moldura branca.
- Foto vertical: prioriza espaços altos (foto única, duas colunas, editorial).
- Se faltar foto do formato certo, o slide muda de template em vez de forçar um corte ruim.

## 2. Novos templates

Além dos atuais (Foto única, Moldura, Duas fotos, Grade 4, Editorial), entram:

```text
Duas faixas          Três faixas          Faixa + duas
+-----------+        +-----------+        +-----------+
|     A     |        |     A     |        |     A     |
+-----------+        +-----------+        +-----+-----+
|     B     |        |     B     |        |  B  |  C  |
+-----------+        +-----------+        +-----+-----+
                     |     C     |
                     +-----------+
```

- Duas faixas (2 fotos horizontais, metade/metade)
- Três faixas (3 fotos horizontais empilhadas) — o template pedido
- Faixa + duas (1 horizontal em cima, 2 verticais embaixo)

Cada um aparece no seletor de layout do editor, com o mesmo desenho miniatura dos demais, e é desenhado igual no editor e na exportação/publicação.

## 3. Sem linha preta entre as fotos

O espaçamento entre fotos passa a ser zero, tanto na pré-visualização quanto na imagem exportada e na publicação. As fotos ficam encostadas, sem faixa escura de separação. A moldura branca continua como está (é um template intencional).

## Detalhes técnicos

- `src/lib/carouselLayouts.ts`: adicionar `strip_2`, `strip_3`, `strip_plus_2`; incluir em cada layout a lista de formatos esperados por slot (`wide` / `tall` / `any`).
- `src/lib/carouselSchema.ts`: `buildDemoCarousel` passa a receber as fotos com orientação e distribuir por compatibilidade; planos de slides passam a favorecer faixas quando há muitas horizontais. Chamadas em `ProjetoPage.tsx` e `NovoProjetoPage.tsx` atualizadas para enviar orientação.
- `src/components/studio/CarouselSlide.tsx` e `LayoutSelector.tsx`: renderizar os novos layouts e trocar `gap-[3px]` por `gap-0`.
- `src/lib/carouselExport.ts`: `GAP = 0` e novos retângulos em `layoutRects` para os três templates (mesma geometria do editor).

## Verificação

Gerar um carrossel em um projeto com fotos horizontais e verticais misturadas, conferir que nenhuma horizontal caiu em espaço vertical, que os novos templates aparecem e que o download sai sem linhas entre as fotos.
