# Estúdio IA: moldura 3x3 e controle de slides/fotos

## 1. Nova moldura com nove fotos

Adicionar o template "Grade 9": três fotos por linha, três linhas, todos os espaços quadrados, sem divisórias (mesmo padrão atual, sem linha preta entre as fotos).

Ele passa a aparecer:
- na lista de molduras do editor, para trocar manualmente o layout de um slide;
- nas montagens automáticas, quando houver fotos suficientes.

Como os espaços são quadrados, aceitam fotos de qualquer orientação.

## 2. Escolher quantidade de slides e de fotos

Dois novos controles, com os mesmos valores nos dois lugares:

- **Na criação do projeto** (tela "Novo projeto"), abaixo das fotografias: "Quantos slides" e "Quantas fotos usar".
- **Dentro do projeto**, junto ao botão "Regenerar carrossel": os mesmos dois controles, para refazer a montagem com outra combinação.

Regras acordadas:
- Slides: de 1 a 10 (limite do Instagram). Padrão: 7, como hoje.
- Fotos: de 1 até o total enviado. Padrão: todas as fotos enviadas.
- O sistema tenta montar exatamente o número de slides pedido; se as fotos não fecharem, monta o máximo possível e avisa em uma mensagem.
- A quantidade de fotos escolhida é usada por inteiro, distribuída entre os slides.
- Quando a pessoa usar menos fotos do que enviou, o próprio sistema escolhe quais entram, priorizando variedade de formatos (como já faz hoje).

## 3. Como o sistema cruza as duas informações

O gerador deixa de usar as sequências fixas de sete molduras e passa a montar a partir da conta fotos ÷ slides:

1. Calcula quantas fotos cabem em média por slide.
2. Distribui o total escolhido entre a quantidade de slides pedida (por exemplo: 20 fotos em 7 slides vira uma mistura de slides com 1, 2, 3 e 4 fotos).
3. Para cada slide, escolhe a moldura de capacidade correspondente que combina com as orientações disponíveis (fotos horizontais nunca vão para espaços verticais, regra que já existe).
4. Mantém variedade: evita repetir a mesma moldura em sequência e continua alternando fotos únicas com grades.

Exemplos: 9 fotos e 1 slide viram a nova grade 3x3; 30 fotos em 5 slides usam grades maiores; 5 fotos em 5 slides viram cinco fotos únicas.

## Detalhes técnicos

- `src/lib/carouselLayouts.ts`: novo `grid_9` (capacidade 9, nove slots `any`).
- `src/components/studio/CarouselSlide.tsx`: grade `grid-cols-3 grid-rows-3`, `gap-0`.
- `src/lib/carouselExport.ts`: retângulos 3x3 em `layoutRects` (renderização/publicação).
- `src/components/studio/LayoutSelector.tsx`: miniatura do novo template.
- `src/lib/carouselSchema.ts`: `buildDemoCarousel` recebe `{ slideCount, photoCount }`; substitui os planos fixos por uma distribuição calculada, com fallback por capacidade e retorno indicando quando não foi possível atingir o número pedido.
- `src/pages/estudio/NovoProjetoPage.tsx` e `ProjetoPage.tsx` (via `CarouselEditor.tsx`): estados e controles novos, passados ao gerador.
- Sem alteração de banco de dados: as opções são escolhas do momento da geração.
- Atualizar a versão para 3.6.7.
