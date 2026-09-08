# Melhorar a orientação do campo "Contexto do ensaio"

Ajuste apenas de texto na tela "Novo projeto" do Estúdio IA. Nenhuma mudança em banco de dados, campos, geração de legenda ou qualquer outro comportamento.

## O que muda

Hoje o campo tem só o título "Contexto do ensaio" e um exemplo curto no fundo, o que faz muitos fotógrafos escreverem uma frase genérica. Como a qualidade da legenda depende diretamente do que é escrito aqui, o campo passa a orientar melhor.

1. Texto de apoio abaixo do título, explicando em uma linha que quanto mais detalhes reais, melhor a legenda, e que a inteligência artificial nunca inventa nada que não estiver escrito ali.

2. Lista curta de sugestões do que contar, exibida como uma dica discreta abaixo do campo:
   - nomes das pessoas,
   - local e tipo de cerimônia,
   - quem estava presente e o que essas pessoas representam,
   - algo marcante do dia, um gesto, um imprevisto, uma emoção,
   - a personalidade do casal ou da pessoa fotografada,
   - detalhes escolhidos por eles que tenham significado.

3. Exemplo dentro do campo trocado por um texto mais rico, no estilo do que gera uma boa legenda, por exemplo: "Casamento da Juliane e do Arthur, na fazenda da família dela. Cerimônia ao ar livre no fim da tarde, com a irmã dela lendo uma carta e o avô emocionado na entrada. Muita gente próxima, clima leve e fé presente o dia todo."

O restante da tela (nome do projeto, tipo de ensaio, upload de fotos, botões) fica exatamente igual.

## Detalhes técnicos

- `src/pages/estudio/NovoProjetoPage.tsx`: adicionar parágrafo de apoio e lista de dicas no bloco do campo `descricao`, e atualizar o `placeholder` do `Textarea`. Nada além disso.
- `src/lib/version.ts` atualizado para 3.6.6.
