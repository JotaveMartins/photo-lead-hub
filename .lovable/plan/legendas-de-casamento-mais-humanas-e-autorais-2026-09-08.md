# Legendas de casamento mais humanas e autorais

Alteração apenas nas instruções enviadas à inteligência artificial que escreve a legenda no Estúdio IA, e somente quando o tipo de ensaio do projeto for Casamento. Nada de interface, banco de dados, campos, fluxos ou automações muda.

## O que muda na escrita

Quando o projeto for de casamento, a IA passa a receber um conjunto de instruções específico, no lugar da estrutura genérica atual (que hoje pede identificação, conexão com o ensaio e fechamento reforçando o trabalho do fotógrafo, sempre na mesma ordem):

- Antes de escrever, escolher internamente o elemento mais interessante do contexto informado (família, personalidade do casal, fé, um gesto, um imprevisto, um detalhe da cerimônia, o ambiente) e usá-lo como fio condutor.
- A legenda deve parecer daquele casal, não um resumo do briefing.
- Estilo humano, sensível, contemplativo, com leve toque poético; mistura de frases curtas e desenvolvidas; preferir cenas e observações a frases genéricas sobre amor.
- Não é obrigatório citar fotografia ou o trabalho do fotógrafo. O nome do casal pode aparecer no início, meio ou fim.
- Variação obrigatória de abertura e de tamanho: contexto simples gera legenda menor, contexto rico gera legenda mais desenvolvida.
- De 3 a 7 parágrafos curtos, sem título e sem explicações. Emoji discreto no fim (por exemplo 🤍) apenas quando combinar.
- Proibido inventar fatos. Interpretação emocional dos fatos informados é permitida.
- Lista de bloqueios: estruturas típicas de IA ("não é sobre X, é sobre Y", "mais do que X, Y", "cada detalhe conta uma história", "duas almas", "uma nova jornada", "um sonho que se tornou realidade", entre outras), clichês de casamento, excesso de amor/conexão/essência/jornada/eternidade/cumplicidade/sonhos, perguntas retóricas em excesso, tom publicitário, CTA comercial, hashtags e travessões.
- Duas referências de estilo novas (Harumi & Leonardo e Juliane e Arthur), marcadas como referência de sensibilidade e ritmo, nunca de estrutura fixa.

Os demais segmentos (gestante, corporativo, família, formatura e outros) continuam exatamente como estão hoje.

## Detalhes técnicos

- `supabase/functions/generate-carousel-caption/knowledge.ts`: novo bloco `WEDDING_CAPTION_DIRECTIVE` com objetivo, estilo, variação, proibições, formato e as duas referências enviadas; nenhuma remoção do conteúdo existente.
- `supabase/functions/generate-carousel-caption/index.ts`: quando `segment === "Casamento"`, o prompt da etapa 2 usa `WEDDING_CAPTION_DIRECTIVE` no lugar de `CAPTION_STRUCTURE` e das referências gerais, mantendo segmento, análise visual, categoria e preferências. A instrução final do usuário para casamento passa a pedir o fio condutor e a variação, sem CTA nem hashtags. Etapa 1 (análise das fotos) permanece intacta.
- A limpeza automática de travessões (`stripEmDashes`) continua como rede de segurança.
- `src/lib/version.ts` atualizado para 3.6.5.
