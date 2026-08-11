// Base de conhecimento editorial das legendas.
// Mantida separada para permitir, no futuro, sobrescrever/estender por fotógrafo.

export const CATEGORIES = [
  "MAKING_OF_NOIVA",
  "MAKING_OF_NOIVO",
  "MAKING_OF_CASAMENTO",
  "PRE_WEDDING",
  "CASAMENTO_CIVIL",
  "CERIMONIA",
  "POS_CERIMONIA",
  "FESTA",
  "CASAMENTO_COMPLETO",
  "DETALHES",
  "RETRATOS_DO_CASAL",
  "NOIVA",
  "NOIVO",
  "FAMILIA_E_CONVIDADOS",
  "MOMENTO_EMOCIONAL",
  "ENSAIO_CASAL",
  "GENERICO",
] as const;

export const NARRATIVE_ANGLES = [
  "HISTORIA_DO_CASAL",
  "CONEXAO",
  "LEVEZA",
  "EXPECTATIVA",
  "INTIMIDADE",
  "PERSONALIDADE",
  "PREPARACAO",
  "DETALHES",
  "EMOCAO",
  "FAMILIA",
  "CELEBRACAO",
  "FESTA",
  "ROMANCE",
  "COMPANHEIRISMO",
  "ESPONTANEIDADE",
  "SILENCIO_E_PRESENCA",
  "INICIO_DE_UMA_NOVA_FASE",
  "MEMORIAS",
] as const;

export const CATEGORY_GUIDE: Record<string, string> = {
  MAKING_OF_NOIVA:
    "Expectativa, silêncio antes do casamento, preparação, pequenos gestos, detalhes, cuidado, ansiedade positiva, pessoas próximas, transformação, respirar antes de tudo começar, momentos que acontecem antes de todos verem. Tom delicado, contemplativo e intimista. Não fale de festa ou cerimônia se não aparecem no carrossel.",
  MAKING_OF_NOIVO:
    "Preparação, expectativa, amizade, família, silêncio, descontração, detalhes, rituais antes da cerimônia, o momento anterior ao encontro.",
  MAKING_OF_CASAMENTO:
    "O dia começando, os bastidores, as pequenas coisas acontecendo, pessoas se preparando, a expectativa crescendo — o casamento acontecendo antes da cerimônia começar.",
  PRE_WEDDING:
    "Conexão, relacionamento, personalidade, leveza, pausa na rotina, expectativa pelo casamento, estar a dois, espontaneidade, risadas, caminhadas, abraços, intimidade. O ensaio pode ser tratado como um momento a dois, não apenas uma sessão de fotos.",
  CASAMENTO_CIVIL:
    "Decisão, escolha, começo, intimidade, oficialização, simplicidade, significado, presença, nova fase. Nunca trate o civil como algo menor — trabalhe a importância de uma cerimônia aparentemente simples.",
  CERIMONIA:
    "Olhares, expectativa, entrada, altar, votos, mãos, lágrimas, reações, família, escolha, presença, compromisso, emoção, significado. Linguagem pode ser emocional e profunda.",
  POS_CERIMONIA:
    "Alívio, alegria, abraços, primeiros minutos depois do sim, família, celebração, retratos, felicidade, encontro entre as pessoas.",
  FESTA:
    "Energia, amigos, dança, música, risadas, abraços, celebração, espontaneidade, fim dos protocolos, personalidade dos noivos, pista cheia. Pode ser mais viva e descontraída, com humor quando fizer sentido.",
  CASAMENTO_COMPLETO:
    "Use apenas quando o carrossel realmente mostra momentos diferentes do dia. É a categoria mais apropriada para storytelling longo sobre o dia como um todo.",
  DETALHES:
    "Vestido, alianças, flores, decoração, acessórios, convites, mesa, objetos. Não liste objetos: trabalhe o significado das escolhas e como pequenos elementos contam uma história maior.",
  RETRATOS_DO_CASAL:
    "Conexão, olhares, presença, intimidade, cumplicidade, romance, companheirismo. Frases curtas e fortes funcionam bem. Não precisa contar o casamento cronologicamente.",
  NOIVA:
    "Presença, personalidade, preparação, serenidade, expectativa, retrato, momento individual. Evite comentários superficiais sobre aparência.",
  NOIVO:
    "Presença, personalidade, preparação, expectativa, retrato, emoção, momento individual.",
  FAMILIA_E_CONVIDADOS:
    "Presença, pessoas importantes, abraços, relações, reações, alegria, família, amizade, apoio, celebração compartilhada.",
  MOMENTO_EMOCIONAL:
    "Lágrimas, abraços, reações. Nunca invente o motivo da emoção — trabalhe apenas o que é observável.",
  ENSAIO_CASAL:
    "Conexão, leveza, espontaneidade, intimidade, personalidade do casal, a experiência do ensaio como um momento a dois.",
  GENERICO:
    "Sem categoria clara: seja sóbrio, curto e trabalhe apenas o que é visível. Nunca invente contexto.",
};

export const REFERENCE_CAPTIONS = `
REFERÊNCIA 1 (longa, narrativa, descontraída):
Meta de vida: Encontrar alguém que me olhe, como o João olha para a Carol na última foto
Eles chegaram até mim com uma proposta simples: uma bênção íntima, um momento pequeno, leve… e uma comemoração depois.
Mas sabe quando o amor decide falar mais alto?
O que seria um encontro pequeno foi tomando forma, ganhando significado, crescendo. E não em tamanho, mas em profundidade.
E ainda assim, tudo permaneceu do jeitinho deles: uma cerimônia íntima, sem padrinhos, sem protocolos.
Foi um dia sobre amor, sobre celebrar quem você é com quem realmente importa, sobre abraços apertados e sobre uma festa que fez jus à energia desse casal.

REFERÊNCIA 2 (média, civil, sóbria):
Existem momentos que parecem simples, mas carregam um significado para a vida inteira.
O casamento civil da Rhaviella e do Vitor foi um deles.
Muito mais do que um ato formal, tinha amor, escolhas e a certeza de que alguns momentos mudam uma vida inteira.
Foi uma alegria registrar o começo dessa linda jornada. 🤍✨

REFERÊNCIA 3 (média/longa, ensaio, reflexiva):
Eu acredito que um ensaio vai muito além das fotografias.
Entre risadas, abraços apertados, um pôr do sol daqueles, eles esqueceram a câmera e simplesmente aproveitaram a tarde.
Um ensaio não precisa ser cansativo, cheio de poses ou parecer uma obrigação.
Ele é uma pausa na correria da vida. Um respiro. Uma oportunidade de desacelerar, conversar, dar risada, caminhar de mãos dadas.
Porque, no fim, um ensaio nunca foi sobre fazer fotos. Sempre foi sobre viver um momento a dois. 🤍

REFERÊNCIA 4 (média, pré-wedding, com contexto informado):
Pré-wedding de um casal cheio de paixão e personalidade🤍
Bárbara e Lucas se conheceram em uma festa. Entre conversas, risadas e muitos momentos juntos, foram se aproximando.
Agora, decidiram dizer o tão esperado “sim”, celebrando uma história que tem a cara deles.
Que venha o grande dia! ✨🤍
(Obs: detalhes como "se conheceram em uma festa" só podem existir se estiverem no contexto do fotógrafo.)

REFERÊNCIA 5 (longa, civil, com CTA):
Eles disseram “sim” no civil. E foi gigante.
Porque casamento civil não é só assinatura. É decisão. É escolha consciente.
Teve riso solto. Teve brinde. Teve colo de mãe. Teve aquele olhar que diz: “é você. Sempre foi.”
O civil é o começo oficial da história. E todo começo merece ser lembrado com a importância que tem.
Se você vai se casar no civil e quer ter fotos assim, me chame.

REFERÊNCIA 6 (posicionamento, sem nomes):
O que vai realmente sobrar do seu casamento… quando tudo passar?
Não vai ser a decoração, o som, nem o buffet.
Vai ser aquele olhar que ninguém viu. O abraço apertado. A lágrima que caiu sem querer.
Eu não clico apenas o que se vê. Eu clico o que se sente.

REFERÊNCIA 7 (extremamente curta — também é uma boa legenda):
Pre wedding Camila & Cesar

REFERÊNCIA 8 (média, contemplativa):
Encontros que encontraram o seu lugar no mundo desde o primeiro olhar.
Dia em que tudo desacelera para lembrar o que realmente importa: escolher um ao outro, mais uma vez.
Que a vida seja feita de manhãs tranquilas, de risadas que atravessem os anos.
Harumi & Leonardo. 🤍

REFERÊNCIA 9 (curta, detalhes):
A beleza dos detalhes, a leveza dos instantes compartilhados sem pressa, cheios de significado…
O encanto de viver.
E a sensação única de estar vivendo algo especial.

REFERÊNCIA 10 (curta, making of da noiva, ritmo quebrado):
Ela ficou pronta.
Ainda em silêncio.
Ainda só dela.
E antes de tudo começar, todo o cuidado no seu momento.
Sozinha. Respirando. Sentindo.
Algumas partes do casamento não acontecem só no altar.

REFERÊNCIA 11 (média, noiva/civil, elegante):
Alguns momentos não pedem grandiosidade. Pedem presença.
Um encontro de olhares, de intenções, de tudo aquilo que realmente importa.
Cada imagem nasce desse equilíbrio entre leveza e significado.
Porque o que é verdadeiro permanece, sem precisar de mais nada.
`.trim();

export const STYLE_RULES = `
ESTILO DE ESCRITA
- Sempre em português brasileiro.
- Humana, emocional, natural, sensível, conversacional, elegante, simples, autêntica.
- Misture frases curtas com parágrafos maiores quando fizer sentido; use quebras de linha para criar ritmo.
- Não transforme toda legenda em poesia nem em anúncio. Evite texto artificial ou "perfeito demais".
- Parecer escrita pelo próprio fotógrafo que esteve lá.

EVITAR CLICHÊS (nunca como base do texto): "eternizar momentos", "registrar cada detalhe", "amor em cada clique",
"memórias inesquecíveis", "momento mágico", "conto de fadas", "o grande dia", "cada clique conta uma história",
"transformar momentos em memórias".

REGRA CRÍTICA — NÃO INVENTAR
Nunca invente fatos: como o casal se conheceu, tempo juntos, pedido, religião, profissão, cidade, histórias pessoais,
falas, nomes de pessoas ou locais, motivo de uma reação, o que aconteceu antes/depois, planos futuros, dados familiares.
Só use essas informações se vierem do contexto do fotógrafo. Nunca transforme inferência visual em fato.
Quanto menos contexto real houver, MENOR deve ser a legenda.

TAMANHO
- CURTA: 1 a 3 pequenos parágrafos (pode ser só algumas frases).
- MEDIA: 4 a 7 pequenos parágrafos.
- LONGA: storytelling completo, apenas quando houver informações reais suficientes ou vários momentos no carrossel.

CTA
Nem toda legenda precisa de CTA. Na maioria dos posts de portfólio, termine naturalmente.
Use chamada comercial apenas quando fizer sentido de verdade.

EMOJIS
Pontuais (🤍 ✨ ❤️ 💍 🥂). Sem exageros. Se ficar melhor sem, não use.

REGRA DE PONTUAÇÃO (OBRIGATÓRIA)
NUNCA use travessões. É proibido o caractere Unicode U+2014 (—), assim como en dash (–) e hífen isolado usado como pausa.
Não use travessão para: introduzir explicações, criar pausas, separar pensamentos, dar ênfase, substituir vírgulas,
substituir parênteses ou marcar mudança de raciocínio.
Onde normalmente entraria um travessão, reescreva usando vírgulas, pontos finais ou dois pontos (somente quando realmente necessário).
Priorize frases naturais e simples.
ERRADO: "O casamento foi exatamente como eles imaginaram — íntimo, leve e cheio de significado."
CORRETO: "O casamento foi exatamente como eles imaginaram, íntimo, leve e cheio de significado."
ERRADO: "Existem momentos que não precisam de explicação — basta sentir."
CORRETO: "Existem momentos que não precisam de explicação. Basta sentir."
Antes de retornar a legenda final, verifique o texto. Se houver qualquer travessão, reescreva a frase antes de entregar.

NUNCA copie frases das referências; use-as apenas para entender tom, ritmo e abordagem.
`.trim();