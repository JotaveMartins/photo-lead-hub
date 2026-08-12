# Excluir projetos como visualizador + legendas por segmento

## 1. Exclusão de projetos ao visualizar como cliente

Hoje o administrador já consegue **ver** os projetos das contas dos clientes (liberação de leitura feita na última alteração), mas as regras de acesso ainda só permitem **alterar ou apagar** projetos da própria conta. Por isso a exclusão falha no modo visualizador.

Ajuste: liberar, para contas de administrador, também as ações de editar e excluir em projetos, fotos, carrosséis, slides e nos arquivos de fotos guardados. Isso cobre:
- enviar para a Lixeira,
- restaurar da Lixeira,
- excluir permanentemente (que remove carrosséis, slides, fotos e arquivos).

O registro de "quem excluiu" continua guardando a conta do administrador, não a do cliente.

## 2. Legenda da IA orientada ao segmento do projeto

O prompt enviado será reescrito com base no modelo do exemplo corporativo, porém **generalizado**: o segmento vem do campo "Tipo de ensaio" do projeto (Casamento, Pré-Wedding, Gestante, Família, Corporativo, Debutante, Formatura, Outro) e os detalhes vêm do campo "Contexto do ensaio".

Estrutura que a IA passará a seguir:
- Objetivo: a publicação funciona como portfólio, mas a legenda não descreve as fotos. Ela mostra o valor daquele tipo de ensaio para quem é o público daquele segmento.
- Ideia central adaptada ao segmento (ex.: corporativo, presença e percepção profissional; gestante, expectativa e transição; família, vínculo; formatura, conquista; casamento, história e emoção).
- Abertura com uma ideia de identificação ou reflexão, conexão com o ensaio realizado, fechamento reforçando o trabalho do fotógrafo de forma natural.
- Tom humano, direto, sofisticado, natural e seguro, sem linguagem comercial excessiva.
- Proibido inventar qualquer informação sobre a pessoa fotografada (carreira, especialidade, clientes, trajetória, história) que não esteja no contexto do projeto.
- Clichês proibidos, incluindo os citados: "eternizar momentos", "registrar histórias", "cada detalhe", "capturar sua essência", "mais do que uma foto".
- Sem excesso de hashtags genéricas. CTA apenas sutil e quando fizer sentido.
- Regra atual de nunca usar travessão permanece.

A base editorial atual, hoje toda voltada a casamento, ganha orientação equivalente para os demais segmentos, para que a análise das fotos e a escrita não puxem vocabulário de casamento em um ensaio corporativo.

## Detalhes técnicos

- Migração: políticas de INSERT/UPDATE/DELETE para administradores em `projects`, `photos`, `carousels`, `carousel_slides`, `slide_photos` e política de DELETE/UPDATE no bucket `project-photos` condicionadas a `has_role(auth.uid(), 'admin')`.
- `supabase/functions/generate-carousel-caption/knowledge.ts`: adicionar mapa de segmentos (`SEGMENT_GUIDE`) com objetivo, ideia central, vocabulário e armadilhas por tipo de ensaio; incluir os clichês novos em `STYLE_RULES`.
- `supabase/functions/generate-carousel-caption/index.ts`: usar `project.tipo_ensaio` para selecionar o guia de segmento e injetá-lo tanto na etapa de análise (para não classificar tudo como casamento) quanto na etapa de escrita, com a estrutura de legenda descrita acima.
- Ajustar `src/lib/version.ts` para 3.5.1.

## Confirmação sobre o prompt

Entendi assim: o texto enviado é um exemplo aplicado ao caso corporativo do Fábio, e o que fica gravado no sistema é a lógica dele (objetivo, direção de escrita, proibições, ideia central, estrutura), adaptada automaticamente ao segmento e ao contexto preenchidos em cada projeto. Nada do caso do Fábio fica fixo na IA.
