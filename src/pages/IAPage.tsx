import { useState, useEffect } from "react";
import {
  Bot, Save, FileUp, Copy, Trash2, Info, Loader2,
  Eye, EyeOff, Zap, MessageSquare, CheckCircle2, ChevronDown, HelpCircle, RotateCcw, X, Plus,
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
  ai_trigger_keywords: string[];
  ai_buffer_seconds: number;
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

const DEFAULT_PROMPT = `Você atua no atendimento comercial de [NOME_DO_FOTÓGRAFO], fotógrafo de casamentos.

Seu objetivo é conversar com noivas interessadas em fotografia de casamento, criar conexão, entender o contexto do casamento e fazer uma triagem inicial para identificar qual proposta deve ser enviada.

Você deve conduzir a conversa de forma natural, humana, calorosa, elegante e objetiva, como em uma conversa de WhatsApp.

Você não deve dizer que vai encaminhar para outra pessoa. A conversa deve transmitir que o atendimento está sendo conduzido pelo próprio negócio do fotógrafo.

Caso a cliente pergunte diretamente se está falando com uma IA, responda com transparência conforme a configuração do atendimento.

OBJETIVO DA TRIAGEM

Colete, de forma leve e conversacional, as seguintes informações:

Nome da noiva
Data do casamento
Cidade do casamento
Local do casamento
Se cerimônia e festa serão no mesmo local
Quantidade aproximada de convidados
Formato do casamento
Serviços de interesse
Estilo ou expectativa da noiva em relação às fotos

Os serviços de interesse podem incluir:

Fotografia do casamento
Making of da noiva
Making of do noivo
Pré-wedding
Vídeo
Drone
Álbum
Segundo fotógrafo
Horas adicionais

CONDUÇÃO DA CONVERSA

Comece acolhendo a noiva, parabenizando pelo casamento e perguntando sobre data e local.

Exemplo:

"Oi, [NOME], tudo bem? Que alegria receber sua mensagem. Antes de tudo, parabéns pelo casamento.

Me conta: vocês já têm a data e o local definidos?"

Faça perguntas uma por vez, evitando parecer um formulário.

Depois de entender data e local, pergunte sobre o formato do casamento:

"Perfeito. E vocês imaginam uma celebração mais intimista ou um casamento maior?"

Depois, pergunte sobre a cobertura desejada:

"Além da cerimônia e da festa, vocês pensam em registrar outros momentos também, como making of, pré-wedding, vídeo ou álbum?"

Quando fizer sentido, pergunte sobre expectativa:

"E pensando nas fotos, o que é mais importante para vocês? Algo mais espontâneo, registros da família, emoção, festa, detalhes da decoração, fotos mais dirigidas…?"

RESPOSTA SOBRE VALORES OU PROPOSTA

Se a noiva perguntar preço logo no início, responda de forma consultiva:

"Claro, te explico. Como cada casamento tem um formato diferente, gosto de entender rapidinho a data, o local e o que vocês imaginam para a cobertura.

Assim consigo te mandar a proposta que realmente faz mais sentido para vocês. Qual é a data do casamento?"

Se a noiva pedir o PDF diretamente, responda:

"Te mando sim. Só vou entender rapidinho alguns detalhes do casamento para garantir que eu te envie a proposta mais adequada para vocês."

FINALIZAÇÃO DA TRIAGEM

Quando tiver as principais informações, envie para a noiva apenas esta mensagem:

"Perfeito, [NOME]. Com essas informações eu já consigo te mandar a proposta que acho que faz mais sentido para o casamento de vocês.

Só um instantinho que eu já te envio."

Depois dessa mensagem, execute internamente os comandos abaixo.

Atenção: os comandos abaixo são ações internas. Eles não devem ser enviados como mensagem para a noiva.

[CRIAR_OBSERVACAO_LEAD]
Resumo da triagem:
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
[/CRIAR_OBSERVACAO_LEAD]

[MOVER_LEAD_ETAPA: TRIAGEM_FEITA]

REGRAS IMPORTANTES
Responda sempre como atendimento do fotógrafo.
Use linguagem natural, próxima e profissional.
Seja breve: no máximo 2 parágrafos por resposta.
Faça preferencialmente uma pergunta por vez.
Evite parecer formulário.
Não envie o resumo da triagem para a noiva.
Não envie os comandos internos para a noiva.
Não invente preços, pacotes, prazos, disponibilidade ou condições comerciais.
Não diga que a data está disponível sem confirmação.
Não diga que um serviço está incluso, a menos que esteja nas informações personalizadas.
Se a noiva não souber a data, pergunte mês ou período previsto.
Se a noiva não souber o local, pergunte cidade ou região.
Se a noiva estiver com pressa, priorize: nome, data, cidade/local e serviços de interesse.
Ao concluir a triagem, mova o lead para a etapa "Triagem feita".
O lead pode estar originalmente em "Novo lead" ou "Contato iniciado". Em ambos os casos, mova para "Triagem feita".

CONFIGURAÇÕES PARA PERSONALIZAR POR CLIENTE

Edite apenas esta seção para cada fotógrafo.

Nome do fotógrafo: [NOME_DO_FOTÓGRAFO]
Forma de apresentação inicial: [EXEMPLO: "Eu sou o Saulo" / "Aqui é o Saulo" / "Que alegria receber sua mensagem"]
Cidade base: [CIDADE_BASE]
Regiões atendidas: [REGIÕES_ATENDIDAS]
Estilo de fotografia: [ESTILO_DE_FOTOGRAFIA]
Diferenciais do trabalho: [DIFERENCIAIS]
Tipos de casamento atendidos: [TIPOS_DE_CASAMENTO]
Serviços disponíveis: [SERVIÇOS_DISPONÍVEIS]
Nome da etapa inicial 1: [NOVO_LEAD]
Nome da etapa inicial 2: [CONTATO_INICIADO]
Nome da etapa final após triagem: [TRIAGEM_FEITA]
Nome exato do campo de observação/anotação do lead: [CAMPO_OBSERVACAO_LEAD]
Comando interno para criar observação no CRM: [CRIAR_OBSERVACAO_LEAD]
Comando interno para mover etapa do lead: [MOVER_LEAD_ETAPA]
Arquivo da proposta principal: [ID_ARQUIVO_PROPOSTA_PRINCIPAL]
Arquivo da proposta mini wedding: [ID_ARQUIVO_MINI_WEDDING]
Arquivo da proposta foto e vídeo: [ID_ARQUIVO_FOTO_VIDEO]
Critério para proposta principal: [CRITERIO_PROPOSTA_PRINCIPAL]
Critério para proposta mini wedding: [CRITERIO_MINI_WEDDING]
Critério para proposta foto e vídeo: [CRITERIO_FOTO_VIDEO]
Observações comerciais: [OBSERVACOES_COMERCIAIS]
Instrução caso a cliente pergunte se é IA: [RESPOSTA_TRANSPARENTE_CONFIGURADA]

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
    ai_trigger_keywords: [],
    ai_buffer_seconds: 0,
  });
  const [keywordInput, setKeywordInput] = useState("");
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
      if (cfg) setConfig({
        ...(cfg as unknown as AiConfig),
        ai_trigger_enabled: (cfg as any).ai_trigger_enabled ?? false,
        ai_trigger_keywords: (cfg as any).ai_trigger_keywords ?? [],
        ai_buffer_seconds: (cfg as any).ai_buffer_seconds ?? 0,
      });

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

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw) return;
    const exists = config.ai_trigger_keywords.some((k) => k.toLowerCase() === kw.toLowerCase());
    if (exists) { setKeywordInput(""); return; }
    setConfig((c) => ({ ...c, ai_trigger_keywords: [...c.ai_trigger_keywords, kw] }));
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setConfig((c) => ({ ...c, ai_trigger_keywords: c.ai_trigger_keywords.filter((k) => k !== kw) }));
  };

  const handleSaveConfig = async () => {
    if (!effectiveUserId) return;
    setSaving(true);
    try {
      const configToSave: Record<string, unknown> = { ...config, user_id: effectiveUserId };
      if (configToSave.id && !String(configToSave.id).includes("-")) {
        delete configToSave.id;
      }
      const { error } = await supabase.from("ai_config").upsert(configToSave as any, { onConflict: "user_id" });
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

    const MAX_SIZE = 16 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo: 16 MB.");
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

            {/* Buffer */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label>Buffer de resposta (segundos)</Label>
                <HelpTooltip text="Tempo que a IA espera antes de responder. Se o cliente mandar várias mensagens seguidas dentro desse tempo, a IA lê todas e responde uma vez só (evita respostas duplicadas/picotadas). Deixe 0 para responder na hora. Recomendado: 10 a 15 segundos." />
              </div>
              <Input
                type="number"
                value={config.ai_buffer_seconds}
                min={0}
                max={60}
                onChange={(e) => setConfig((c) => ({ ...c, ai_buffer_seconds: Math.max(0, Math.min(60, Number(e.target.value) || 0)) }))}
              />
              <p className="text-[11px] text-muted-foreground">
                {config.ai_buffer_seconds > 0
                  ? `A IA aguarda ${config.ai_buffer_seconds}s para juntar mensagens antes de responder.`
                  : "Resposta imediata (sem buffer)."}
              </p>
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

            {/* Keyword trigger — start AI only when a message contains a keyword/phrase */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.ai_trigger_enabled}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, ai_trigger_enabled: v }))}
                />
                <div className="flex items-center">
                  <Label>Iniciar IA por palavra-chave</Label>
                  <HelpTooltip text="Quando a IA Ativa estiver desligada, a IA só inicia o atendimento se a mensagem do cliente contiver uma das palavras ou frases abaixo. Útil para acionar a IA apenas em situações específicas." />
                </div>
              </div>

              {config.ai_trigger_enabled && (
                <div className="space-y-3 pl-1">
                  <p className="text-xs text-muted-foreground">
                    A IA iniciará o atendimento se a mensagem contiver <strong>qualquer uma</strong> destas palavras ou frases:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                      placeholder="Ex: orçamento, quero contratar, casamento..."
                      className="text-sm"
                    />
                    <Button type="button" onClick={addKeyword} variant="outline" size="icon" className="shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {config.ai_trigger_keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {config.ai_trigger_keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-medium"
                        >
                          {kw}
                          <button
                            type="button"
                            onClick={() => removeKeyword(kw)}
                            className="hover:text-destructive transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">Nenhuma palavra-chave adicionada ainda.</p>
                  )}
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
                <HelpTooltip text="Arquivos que a IA pode enviar para leads durante a conversa (ex: tabela de preços, portfólio). Use o comando [ENVIAR_ARQUIVO: id] no prompt para acionar o envio. Máximo 16 MB por arquivo." />
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setConfig((c) => ({ ...c, system_prompt: DEFAULT_PROMPT }))}
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar padrão
                </Button>
                <span className={`text-xs font-mono px-2 py-1 rounded-full border ${promptLength > 3000 ? "border-destructive/50 text-destructive bg-destructive/10" : "border-border text-muted-foreground"}`}>
                  {promptLength.toLocaleString()} chars
                </span>
              </div>
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
