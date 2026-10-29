# Análise de atendimento no Inbox

O botão **Análise de atendimento**, abaixo da busca, abre um formulário para a
mensagem de entrada. A busca atual preenche o formulário, mas o texto pode ser
editado. Gerar a análise seleciona até 20 conversas recentes da conta atual,
abertas ou encerradas, cuja **primeira mensagem recebida** corresponde ao texto.
A comparação ignora maiúsculas e espaços repetidos, mantendo a pontuação e os
acentos. Uma ocorrência no meio de uma conversa não a torna elegível.

A ordem é a data original da primeira mensagem recebida, com `created_at` como
alternativa quando o timestamp não existe. Grupos e notas internas ficam fora
da amostra. Todo o histórico textual disponível de cada conversa selecionada é
analisado, não apenas a mensagem inicial. Se houver menos de 20, o relatório
informa a quantidade efetiva. Históricos extensos demais geram erro explícito,
sem gerar uma análise silenciosamente truncada.

## Relatório

A pessoa revisa a prévia e baixa um PDF com:

- síntese do processo e tamanho real da amostra;
- etapas observadas e modelos de mensagem adaptados;
- pontos fortes, melhorias e limites da análise;
- situação e próximo passo sugerido por atendimento, com nome e telefone.

A identificação real foi solicitada para permitir consulta dos atendimentos no
CRM. O relatório não é anonimizado. Os modelos reutilizáveis usam placeholders.
O PDF contém a análise e o roteiro, não a transcrição integral dos históricos.
Áudios e anexos não são transcritos ou interpretados; apenas textos e legendas
existentes são usados. Intenção, proposta ou cobrança não comprovam pagamento.

O prompt fica em `supabase/functions/analyze-inbox-service/report.ts`. Conversas
são tratadas como dados, nunca como instruções para a IA. Links não são acessados
e são omitidos da entrada do modelo. O resultado é validado antes de ser exibido:
cada conversa precisa ter uma análise com seu código correspondente.

## IA e acesso

A função usa a configuração global existente `app_settings.caption_ai`: OpenAI
com `OPENAI_API_KEY` e o modelo configurado, ou o gateway Lovable com
`LOVABLE_API_KEY` e o mesmo modelo usado na integração atual de legendas.
Não há troca automática para outro provedor se a geração falhar. As credenciais
ficam exclusivamente no backend. A geração pode consumir créditos do provedor.

A função verifica a sessão e permite apenas os dados do próprio usuário. Um
administrador pode analisar a conta que está visualizando por impersonação.
O RPC SQL é executável apenas pelo `service_role`, depois dessa autorização.
Os relatórios não são persistidos no banco ou enviados automaticamente a contatos.
O botão de download gera o arquivo localmente com jsPDF, carregado sob demanda.

## Implantação no Lovable Cloud

1. Aplicar `supabase/migrations/20261029190000_inbox_service_analysis.sql`.
2. Publicar `analyze-inbox-service`, incluindo seu módulo `report.ts` e a
   configuração de `supabase/config.toml`. A função valida a sessão explicitamente.
3. Confirmar que a chave do provedor já configurado para o CRM está disponível
   nas funções. Não colocar segredos no frontend.
4. Sincronizar a `main` e testar pela prévia do Lovable antes de publicar o site.

O frontend precisa da dependência `jspdf`. O lockfile npm foi sincronizado com o
manifesto existente ao adicionar essa biblioteca; `npm ci` é o caminho suportado
para reproduzir a instalação atual.

## Validação

```sh
npm ci
npm test -- --maxWorkers=2
npx --no-install tsc --noEmit -p tsconfig.app.json
npm run build
```

Os testes cobrem autorização por conta, impersonação administrativa, ausência de
resultados sem chamada à IA, limite de tamanho, validação das referências da IA,
preservação de nomes/telefones, estados do formulário e geração de PDF real.
A migração foi exercitada em PostgreSQL local com conversas de duas contas,
frases posteriores à abertura, notas e grupos: somente os 20 inícios elegíveis
mais recentes foram selecionados. A geração com o provedor real e o acesso ao
banco gerenciado ainda exigem validação após implantação no Lovable Cloud.
