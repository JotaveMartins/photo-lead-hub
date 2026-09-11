# Legendas com a sua conta da OpenAI

Hoje a legenda é gerada pela IA da Lovable com o modelo Gemini 3.6 Flash, em duas etapas: uma lê as fotos e outra escreve o texto. A ideia é passar a etapa de escrita para a sua conta da OpenAI, com o modelo definido por você no painel de administração.

## O que muda

1. Sua chave da OpenAI é guardada de forma segura no servidor. Ela nunca aparece na tela nem no navegador.
2. No painel de administração surge um bloco novo, "IA das legendas", com:
   - seletor do modelo da OpenAI a ser usado na escrita (lista dos modelos disponíveis na sua conta, com os mais indicados no topo);
   - opção de voltar para a IA da Lovable a qualquer momento;
   - botão "Testar" que gera uma legenda curta de exemplo e mostra o resultado ou o erro.
3. A configuração vale para todas as contas do CRM, inclusive as dos clientes.
4. A leitura das fotos continua exatamente como está hoje, no modelo atual, que é rápido e barato. Só a escrita da legenda passa para a OpenAI.
5. Todas as regras de escrita atuais (estilo de casamento, proibições, tamanho, sem travessão) continuam iguais.

## Comportamento em caso de falha

Se a chave estiver ausente, inválida ou sem saldo, a legenda é gerada pela IA da Lovable como antes, e o erro aparece de forma clara para o administrador. O fotógrafo nunca fica sem legenda por causa disso.

## Detalhes técnicos

- Nova secret `OPENAI_API_KEY` no backend.
- Nova tabela `public.caption_ai_settings` (linha única): `provider` (`openai` | `lovable`), `openai_model`, `updated_at`, `updated_by`. RLS + GRANTs: leitura/escrita apenas para admin (`has_role(auth.uid(),'admin')`); a edge function lê via service role.
- `supabase/functions/generate-carousel-caption/index.ts`: a etapa 1 (visão) segue no gateway atual; a etapa 2 passa a ler as configurações e, quando `provider = openai`, chama `https://api.openai.com/v1/chat/completions` com o modelo escolhido, tratando 401/429/insufficient_quota com fallback para o gateway.
- Nova edge function `list-openai-models` (admin-only) para popular o seletor a partir de `GET /v1/models`, filtrando modelos de chat.
- Novo componente de configuração na aba de administração + hook de leitura/gravação; sem alterações em outras telas do Estúdio IA.
- Bump de versão em `src/lib/version.ts`.
