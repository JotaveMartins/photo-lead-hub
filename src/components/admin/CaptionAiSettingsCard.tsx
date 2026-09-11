import { useEffect, useState } from "react";
import { Save, Sparkles, Plug, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FALLBACK_MODELS = ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"];

const CaptionAiSettingsCard = () => {
  const [provider, setProvider] = useState<"lovable" | "openai">("lovable");
  const [model, setModel] = useState("gpt-4o");
  const [models, setModels] = useState<string[]>(FALLBACK_MODELS);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke("caption-ai-admin", {
        body: { action: "list-models" },
      });
      if (error) throw error;
      if (data?.ok && Array.isArray(data.models) && data.models.length) {
        setModels(data.models);
      } else if (data?.error) {
        setResult({ ok: false, message: data.error });
      }
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Não foi possível listar os modelos" });
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "caption_ai")
        .maybeSingle();
      const v: any = data?.value || {};
      setProvider(v.provider === "openai" ? "openai" : "lovable");
      setModel(v.openai_model || "gpt-4o");
      setLoading(false);
      loadModels();
    })();
  }, []);

  const persist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from("app_settings").upsert(
      {
        key: "caption_ai",
        value: { provider, openai_model: model },
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      },
      { onConflict: "key" }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await persist();
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configuração da IA de legendas salva!");
  };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("caption-ai-admin", {
        body: { action: "test", model },
      });
      if (error) throw error;
      if (data?.ok) {
        setResult({ ok: true, message: `Funcionando. Exemplo: ${data.sample}` });
        toast.success("Conexão com a OpenAI OK");
      } else {
        setResult({ ok: false, message: data?.error || "Falha no teste" });
        toast.error("Falha no teste");
      }
    } catch (err: any) {
      setResult({ ok: false, message: err.message || "Erro desconhecido" });
      toast.error(err.message || "Erro ao testar");
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <Card className="bg-card border-border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> IA das legendas (Estúdio IA)
        </CardTitle>
        <CardDescription>
          Define quem escreve as legendas dos carrosséis. A leitura das fotos continua na IA padrão.
          A configuração vale para todas as contas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cap-provider">Quem escreve a legenda</Label>
          <select
            id="cap-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as "lovable" | "openai")}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="lovable">IA padrão do sistema</option>
            <option value="openai">Minha conta da OpenAI</option>
          </select>
        </div>

        {provider === "openai" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cap-model">Modelo da OpenAI</Label>
              <Button variant="ghost" size="sm" onClick={loadModels} disabled={loadingModels} className="gap-1 h-7">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? "animate-spin" : ""}`} /> Atualizar lista
              </Button>
            </div>
            <select
              id="cap-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {!models.includes(model) && <option value={model}>{model}</option>}
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Se a chave estiver inválida ou sem saldo, o sistema volta automaticamente para a IA padrão.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-gradient-primary">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
          {provider === "openai" && (
            <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
              <Plug className={`w-4 h-4 ${testing ? "animate-pulse" : ""}`} />
              {testing ? "Testando..." : "Testar"}
            </Button>
          )}
        </div>

        {result && (
          <div
            className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
              result.ok
                ? "border-green-500/30 bg-green-500/10 text-green-500"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span className="break-words">{result.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CaptionAiSettingsCard;
