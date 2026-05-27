import { useState, useEffect } from "react";
import {
  Bot, Save, FileUp, Copy, Trash2, Info, Loader2,
  Eye, EyeOff, Zap, MessageSquare, CheckCircle2, ChevronDown, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useAiStats } from "@/hooks/useAiStats";
import InboxTriggersConfig from "@/components/InboxTriggersConfig";

interface AiConfig {
  id?: string;
  provider: string;
  model: string;
  api_key: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  knowledge_base: string;
  is_active: boolean;
  ai_trigger_enabled: boolean;
  ai_trigger_keyword: string;
  user_id?: string;
}

const HelpTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help inline-block ml-1 flex-shrink-0" />
    </TooltipTrigger>
    <TooltipContent className="max-w-[230px]">
      <p className="text-xs leading-relaxed">{text}</p>
    </TooltipContent>
  </Tooltip>
);

interface AiFile {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number | null;
  created_at: string | null;
}

const DEFAULT_PROMPT = `Você é [NOME_DO_FOTÓGRAFO], fotógrafo de casamentos.

Você atende noivas pelo WhatsApp com um tom caloroso, humano, elegante, profissional e próximo. Sua função é fazer uma triagem inicial de forma natural, criando conexão e entendendo o casamento antes de enviar a proposta mais adequada.

Seu atendimento deve parecer uma conversa real, leve e consultiva, nunca um formulário.

OBJETIVO PRINCIPAL

Seu objetivo é entender o casamento da noiva para identificar qual proposta faz mais sentido enviar.

Durante a conversa, colete de forma natural:

Nome da noiva
Data do casamento
Cidade e local do casamento
Se cerimônia e festa serão no mesmo local
Quantidade aproximada de convidados
Formato do casamento
mini wedding, casamento tradicional, casamento intimista, destination wedding, elopement ou outro
O que ela deseja registrar
cerimônia
festa
making of da noiva
making of do noivo
pré-wedding
vídeo
drone
álbum
segundo fotógrafo
horas adicionais
O que ela mais valoriza nas fotos
emoção, espontaneidade, família, festa, decoração, fotos dirigidas, estilo documental, estética editorial ou outro ponto importante

Quando tiver as informações principais, finalize dizendo que já consegue enviar a proposta mais adequada.

Inclua obrigatoriamente o comando interno:

[TRIAGEM_FEITA]

COMO SE APRESENTAR

Na primeira mensagem, apresente-se como o próprio fotógrafo.

Exemplo:

"Oi, [NOME], tudo bem? Eu sou o [NOME_DO_FOTÓGRAFO]. Que alegria receber sua mensagem, antes de tudo parabéns pelo casamento.

Me conta uma coisa: vocês já têm a data e o local definidos?"

Se a noiva ainda não tiver informado o nome, use:

"Oi, tudo bem? Eu sou o [NOME_DO_FOTÓGRAFO]. Que alegria receber sua mensagem, antes de tudo parabéns pelo casamento.

Qual é o seu nome? E vocês já têm a data do casamento definida?"

CONDUÇÃO DA CONVERSA
Etapa 1 — Acolhimento

Comece com carinho, parabenize pelo casamento e faça uma pergunta simples.

Exemplo:

"Que alegria receber sua mensagem. Antes de tudo, parabéns pelo casamento. Me conta: vocês já têm a data e o local definidos?"

Etapa 2 — Data e local

Entenda primeiro:

data;
cidade;
local;
se cerimônia e festa serão no mesmo espaço.

Exemplo:

"Perfeito. E vai ser em qual cidade e espaço?"

Depois:

"Cerimônia e festa vão acontecer no mesmo local?"

Etapa 3 — Formato do casamento

Pergunte sobre o tamanho e estilo do casamento.

Exemplo:

"E vocês imaginam uma celebração mais intimista ou um casamento maior?"

Se necessário, pergunte:

"Vocês têm uma ideia de quantos convidados serão mais ou menos?"

Etapa 4 — O que a noiva quer registrar

Investigue os interesses principais de cobertura.

Exemplo:

"Além da cerimônia e da festa, vocês pensam em registrar outros momentos também, como making of, pré-wedding, vídeo ou álbum?"

Se ela demonstrar dúvida, explique de forma breve e consultiva:

"O making of costuma ser um momento muito especial, porque registra a preparação, os detalhes e aquela emoção antes da cerimônia. Já o pré-wedding ajuda o casal a criar mais sintonia com a câmera antes do grande dia."

Etapa 5 — Conexão emocional

Sempre valide o que a noiva compartilhar.

Exemplos:

"Que especial. Esses detalhes ajudam muito a pensar em uma cobertura que tenha a cara de vocês."

"Lindo demais. Dá para perceber que vocês estão cuidando desse dia com muito carinho."

"Perfeito. Esse tipo de informação faz bastante diferença para eu te indicar a proposta mais adequada."

Etapa 6 — Estilo e expectativa

Quando já tiver data, local e formato, pergunte sobre o que ela mais valoriza nas fotos.

Exemplo:

"E pensando nas fotos, o que é mais importante para vocês? Algo mais espontâneo, registros da família, emoção, festa, detalhes da decoração, fotos mais dirigidas…?"

RESPOSTA SOBRE PREÇO

Se a noiva perguntar preço logo no início, responda sem passar valores inventados.

Exemplo:

"Claro, te explico. Como cada casamento tem um formato diferente, eu gosto de entender rapidinho a data, o local e o que vocês imaginam para a cobertura. Assim eu consigo te mandar a proposta que realmente faz mais sentido para vocês.

Qual é a data do casamento?"

Se ela insistir em preço:

"Tenho algumas possibilidades de cobertura, mas para não te mandar algo genérico, prefiro entender primeiro o formato do casamento. É rapidinho: vocês já têm data e local definidos?"

RESPOSTA PARA PEDIDO DIRETO DE PROPOSTA

Se a noiva pedir a proposta ou PDF diretamente, responda:

"Te mando sim. Só vou entender rapidinho alguns detalhes do casamento para garantir que eu te envie a proposta mais adequada para vocês."

Depois continue a triagem.

FINALIZAÇÃO DA TRIAGEM

Quando já tiver as informações principais, finalize assim:

"Perfeito, [NOME]. Com essas informações eu já consigo te mandar a proposta que acho que faz mais sentido para o casamento de vocês.

Só um instantinho que eu já te envio."

Em seguida, inclua:

[TRIAGEM_FEITA]

Depois do comando, gere um resumo interno no seguinte formato:

[RESUMO_TRIAGEM]
Nome da noiva: [NOME]
Data do casamento: [DATA]
Cidade/local: [CIDADE/LOCAL]
Cerimônia e festa no mesmo local: [SIM/NÃO/NÃO INFORMADO]
Formato do casamento: [FORMATO]
Convidados aproximados: [NÚMERO]
Interesses mencionados: [SERVIÇOS]
Estilo/expectativa: [EXPECTATIVA]
Observações importantes: [OBSERVAÇÕES]
Proposta mais indicada: [PROPOSTA_SUGERIDA_OU_NÃO_DEFINIDA]
Próximo passo: enviar PDF de proposta
[/RESUMO_TRIAGEM]

REGRAS IMPORTANTES
Fale sempre em primeira pessoa, como o próprio fotógrafo.
Use "eu", "meu trabalho", "minha cobertura", "minha proposta", quando fizer sentido.
Seja breve: no máximo 2 parágrafos por resposta.
Faça, de preferência, uma pergunta por vez.
Evite parecer formulário.
Crie conexão antes de perguntar demais.
Não diga que vai encaminhar para outra pessoa.
Não mencione estúdio, equipe comercial ou atendimento interno, a menos que isso esteja nas informações personalizadas.
Não invente preços, pacotes, prazos, disponibilidade ou condições comerciais.
Não prometa disponibilidade para a data antes de confirmação.
Não diga que um serviço está incluso, a menos que isso esteja nas informações específicas do fotógrafo.
Se a noiva não souber a data, pergunte mês ou período previsto.
Se a noiva não souber o local, pergunte cidade ou região.
Se a noiva estiver com pressa, priorize: nome, data, cidade/local e interesses principais.
Se a conversa esfriar ou a noiva responder pouco, mantenha o tom leve e conduza com perguntas simples.

INFORMAÇÕES PARA PERSONALIZAÇÃO DO FOTÓGRAFO

Preencha estas informações para cada fotógrafo:

Nome do fotógrafo: [NOME_DO_FOTÓGRAFO]
Cidade base: [CIDADE_BASE]
Regiões atendidas: [REGIÕES_ATENDIDAS]
Estilo de fotografia: [ESTILO_DE_FOTOGRAFIA]
Diferenciais do trabalho: [DIFERENCIAIS]
Tipos de casamento atendidos: [TIPOS_DE_CASAMENTO]
Serviços disponíveis: [SERVIÇOS_DISPONÍVEIS]
Proposta principal: [ID_ARQUIVO_PROPOSTA_PRINCIPAL]
Proposta mini wedding: [ID_ARQUIVO_MINI_WEDDING]
Observações comerciais: [OBSERVAÇÕES_COMERCIAIS]

Use essas informações apenas se estiverem preenchidas.`;

const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: "GPT-4o (recomendado)", value: "gpt-4o" },
    { label: "GPT-4o mini", value: "gpt-4o-mini" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
  ],
  anthropic: [
    { label: "Claude Sonnet 4.6 (recomendado)", value: "claude-sonnet-4-6" },
    { label: "Claude Opus 4.7", value: "claude-opus-4-7" },
    { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
  ],
  gemini: [
    { label: "Gemini 2.0 Flash (recomendado)", value: "gemini-2.0-flash" },
    { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
  ],
  groq: [
    { label: "llama-3.3-70b (recomendado)", value: "llama-3.3-70b-versatile" },
    { label: "mixtral-8x7b", value: "mixtral-8x7b-32768" },
    { label: "llama-3.1-8b-instant", value: "llama-3.1-8b-instant" },
  ],
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const IAPage = () => {
  const effectiveUserId = useEffectiveUserId();
  const { data: stats } = useAiStats();

  const [config, setConfig] = useState<AiConfig>({
    provider: "openai",
    model: "gpt-4o",
    api_key: "",
    temperature: 0.7,
    max_tokens: 1000,
    system_prompt: DEFAULT_PROMPT,
    knowledge_base: "",
    is_active: true,
    ai_trigger_enabled: false,
    ai_trigger_keyword: "",
  });
  const [files, setFiles] = useState<AiFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  useEffect(() => {
    if (effectiveUserId) fetchData();
  }, [effectiveUserId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cfg } = await supabase
        .from("ai_config")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .maybeSingle();
      if (cfg) setConfig(cfg as AiConfig);

      const { data: fls } = await supabase
        .from("ai_files")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("created_at", { ascending: false });
      if (fls) setFiles(fls as AiFile[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    const firstModel = PROVIDER_MODELS[provider]?.[0]?.value || "";
    setConfig((c) => ({ ...c, provider, model: firstModel }));
  };

  const handleSaveConfig = async () => {
    if (!effectiveUserId) return;
    setSaving(true);
    try {
      const configToSave: Record<string, unknown> = { ...config, user_id: effectiveUserId };
      if (configToSave.id && !String(configToSave.id).includes("-")) {
        delete configToSave.id;
      }
      const { error } = await supabase.from("ai_config").upsert(configToSave as any);
      if (error) toast.error("Erro ao salvar: " + error.message);
      else {
        toast.success("Configuração salva com sucesso!");
        await fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.api_key.trim()) {
      toast.error("Informe a API Key antes de testar.");
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-ai-connection", {
        body: { provider: config.provider, api_key: config.api_key, model: config.model },
      });
      if (error) throw error;
      if (data?.ok) toast.success("Conexão bem-sucedida! API Key válida.");
      else toast.error("Falha na conexão: " + (data?.error || "Chave inválida"));
    } catch {
      toast.error("Erro ao testar conexão.");
    } finally {
      setTesting(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveUserId) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo: 10 MB.");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("ai-files")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erro no upload: " + uploadError.message);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("ai-files").getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("ai_files").insert({
      name: file.name,
      file_url: publicUrl,
      file_type: fileExt || "unknown",
      file_size_bytes: file.size,
      user_id: effectiveUserId,
    });

    if (dbError) toast.error("Erro ao salvar no banco: " + dbError.message);
    else {
      toast.success("Arquivo enviado!");
      fetchData();
    }
    e.target.value = "";
  };

  const handleDeleteFile = async (f: AiFile) => {
    const pathFromUrl = new URL(f.file_url).pathname.split("/ai-files/").pop();
    if (pathFromUrl) {
      await supabase.storage.from("ai-files").remove([pathFromUrl]);
    }
    await supabase.from("ai_files").delete().eq("id", f.id);
    fetchData();
  };

  const promptLength = config.system_prompt?.length || 0;
  const modelOptions = PROVIDER_MODELS[config.provider] || [];
  const selectedModelLabel = modelOptions.find((m) => m.value === config.model)?.label || config.model;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Bot className="w-8 h-8 text-primary" />
          Inteligência Artificial
        </h1>
        <p className="text-muted-foreground mt-1">Configure o cérebro do seu atendimento automático.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total de conversas", value: stats.total, icon: MessageSquare, color: "text-primary" },
            { label: "Hoje", value: stats.today, icon: Zap, color: "text-yellow-500" },
            { label: "IA ativa", value: stats.pending_ai, icon: Bot, color: "text-blue-400" },
            { label: "Encerradas", value: stats.closed, icon: CheckCircle2, color: "text-green-500" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider config */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Configurações do Provedor</CardTitle>
            <CardDescription>Escolha o motor da sua IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Provedor</Label>
                <HelpTooltip text="Serviço de IA que processará as conversas. Cada provedor tem seus próprios modelos e preços. OpenAI (ChatGPT) e Gemini são ótimas opções para iniciar." />
              </div>
              <div className="flex flex-wrap gap-2">
                {["openai", "anthropic", "gemini", "groq"].map((p) => (
                  <Button
                    key={p}
                    variant={config.provider === p ? "default" : "outline"}
                    onClick={() => handleProviderChange(p)}
                    className="capitalize"
                    size="sm"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            {/* Model dropdown */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Modelo</Label>
                <HelpTooltip text="Versão específica do motor de IA. Modelos maiores são mais inteligentes mas custam mais. Para atendimento fotográfico, o modelo recomendado de cada provedor já é suficiente." />
              </div>
              {modelOptions.length > 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setModelOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border bg-background text-sm hover:bg-muted transition-colors"
                  >
                    <span className="truncate">{selectedModelLabel}</span>
                    <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${modelOpen ? "rotate-180" : ""}`} />
                  </button>
                  {modelOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                      {modelOptions.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => { setConfig((c) => ({ ...c, model: m.value })); setModelOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors ${config.model === m.value ? "text-primary font-medium bg-primary/5" : "text-foreground"}`}
                        >
                          {m.label}
                        </button>
                      ))}
                      <div className="border-t border-border">
                        <button
                          onClick={() => setModelOpen(false)}
                          className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Digitar modelo manualmente:
                        </button>
                        <div className="px-3 pb-2">
                          <Input
                            value={config.model}
                            onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
                            placeholder="nome-do-modelo"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  value={config.model}
                  onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
                  placeholder="nome-do-modelo"
                />
              )}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>API Key</Label>
                <HelpTooltip text="Chave secreta de acesso à API do provedor. Obtenha no site do provedor (ex: platform.openai.com). Nunca compartilhe essa chave com ninguém." />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={config.api_key}
                    onChange={(e) => setConfig((c) => ({ ...c, api_key: e.target.value }))}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing || !config.api_key}
                  className="gap-2 shrink-0"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Testar
                </Button>
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Label>Temperatura: <span className="text-primary font-mono">{config.temperature}</span></Label>
                  <HelpTooltip text="Controla a criatividade das respostas. Valores baixos (Preciso) geram respostas mais previsíveis e consistentes. Valores altos (Criativo) deixam a IA mais livre, mas pode inventar informações. Para atendimento, use entre 0.3 e 0.7." />
                </div>
                <span className="text-xs text-muted-foreground">
                  {config.temperature <= 0.3 ? "Preciso" : config.temperature <= 0.7 ? "Equilibrado" : "Criativo"}
                </span>
              </div>
              <Slider
                value={[config.temperature]}
                min={0} max={1} step={0.1}
                onValueChange={(v) => setConfig((c) => ({ ...c, temperature: v[0] }))}
              />
            </div>

            {/* Max tokens */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Máximo de tokens por resposta</Label>
                <HelpTooltip text="Limita o tamanho das respostas da IA. 1 token ≈ ¾ de uma palavra em português. 1000 tokens = ~750 palavras. Para atendimento via WhatsApp, 500–1500 é o ideal." />
              </div>
              <Input
                type="number"
                value={config.max_tokens}
                min={100}
                max={4000}
                onChange={(e) => setConfig((c) => ({ ...c, max_tokens: Number(e.target.value) }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.is_active}
                onCheckedChange={(v) => setConfig((c) => ({ ...c, is_active: v }))}
              />
              <div className="flex items-center">
                <Label>IA Ativa</Label>
                <HelpTooltip text="Quando ativado, a IA responde automaticamente às novas mensagens recebidas no inbox. Desative para pausar o atendimento automático sem perder as configurações." />
              </div>
            </div>

            {/* AI keyword trigger */}
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <Label className="font-medium">Palavra-chave de ativação</Label>
                  <HelpTooltip text="Quando ativado, a IA só responderá se a mensagem recebida contiver a palavra-chave definida. Útil para filtrar contatos que realmente querem atendimento. Ex: 'orçamento', 'preço', 'casamento'." />
                </div>
                <Switch
                  checked={config.ai_trigger_enabled}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, ai_trigger_enabled: v }))}
                />
              </div>
              {config.ai_trigger_enabled && (
                <div className="space-y-1.5">
                  <Input
                    value={config.ai_trigger_keyword}
                    onChange={(e) => setConfig((c) => ({ ...c, ai_trigger_keyword: e.target.value }))}
                    placeholder="Ex: orçamento, casamento, preço..."
                    className="bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    A IA só responderá na primeira mensagem que contiver esta palavra. Após iniciar, continua respondendo normalmente.
                  </p>
                </div>
              )}
            </div>

            <Button onClick={handleSaveConfig} disabled={saving} className="w-full bg-gradient-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Configuração
            </Button>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <CardTitle className="text-lg">Banco de Informações</CardTitle>
                <CardDescription>Informações sobre você e seu estúdio que a IA usará nas conversas.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Photographer info textarea */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Sobre o fotógrafo / estúdio</Label>
                <HelpTooltip text="Descreva aqui quem você é, seu estilo de fotografia, especialidades, localização, diferenciais e qualquer informação que a IA deve conhecer para representar melhor o seu negócio." />
              </div>
              <Textarea
                value={config.knowledge_base}
                onChange={(e) => setConfig((c) => ({ ...c, knowledge_base: e.target.value }))}
                placeholder={`Ex: Sou o João Silva, fotógrafo de casamentos e ensaios em São Paulo há 10 anos. Meu estilo é fotojornalístico, capturando momentos naturais e emocionantes. Atendo na Grande São Paulo e litoral paulista. Meu diferencial é a entrega em até 30 dias com álbum digital incluso.`}
                className="min-h-[140px] text-sm resize-none"
              />
              <p className="text-[11px] text-muted-foreground">{config.knowledge_base?.length || 0} caracteres</p>
            </div>

            <Button onClick={handleSaveConfig} disabled={saving} size="sm" className="bg-gradient-primary gap-2 w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar informações
            </Button>

            {/* Files section */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center">
                <p className="text-sm font-medium text-foreground">Arquivos para envio automático</p>
                <HelpTooltip text="Arquivos que a IA pode enviar para leads durante a conversa (ex: tabela de preços, portfólio). Use o comando [ENVIAR_ARQUIVO: id] no prompt para acionar o envio. Máximo 10 MB por arquivo." />
              </div>
              <div className="flex items-center gap-2">
                <Input type="file" onChange={handleUploadFile} className="hidden" id="file-upload" />
                <Label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors w-full justify-center border border-dashed border-primary/30 text-sm"
                >
                  <FileUp className="w-4 h-4 text-primary" /> Adicionar Arquivo
                </Label>
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-5 border border-dashed border-border rounded-lg">
                    Nenhum arquivo enviado ainda.
                  </p>
                ) : (
                  files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-[10px] text-muted-foreground font-mono">ID: {f.id.slice(0, 8)}…</p>
                          <p className="text-[10px] text-muted-foreground">{formatFileSize(f.file_size_bytes)}</p>
                          {f.created_at && (
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(f.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => {
                            navigator.clipboard.writeText(`[ENVIAR_ARQUIVO: ${f.id}]`);
                            toast.success("Comando copiado!");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteFile(f)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System prompt */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Prompt do Sistema</CardTitle>
                <CardDescription>Defina a personalidade e as regras de atendimento.</CardDescription>
              </div>
              <span className={`text-xs font-mono px-2 py-1 rounded-full border ${promptLength > 3000 ? "border-destructive/50 text-destructive bg-destructive/10" : "border-border text-muted-foreground"}`}>
                {promptLength.toLocaleString()} chars
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={config.system_prompt}
              onChange={(e) => setConfig((c) => ({ ...c, system_prompt: e.target.value }))}
              className="min-h-[300px] font-sans text-sm"
            />
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex gap-3 items-start">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Use <strong>[ENVIAR_ARQUIVO: id]</strong> para a IA enviar arquivos automaticamente (copie o ID acima) e{" "}
                <strong>[TRIAGEM_FEITA]</strong> para mover o lead para a etapa de Triagem no Kanban.
              </p>
            </div>
            <Button onClick={handleSaveConfig} disabled={saving} className="bg-gradient-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Prompt
            </Button>
          </CardContent>
        </Card>
      </div>

      <InboxTriggersConfig />
    </div>
    </TooltipProvider>
  );
};

export default IAPage;
