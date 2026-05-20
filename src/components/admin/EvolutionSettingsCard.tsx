import { useEffect, useState } from "react";
import { Save, Server, Plug, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EvolutionSettingsCard = () => {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "evolution")
        .maybeSingle();
      const v: any = data?.value || {};
      setBaseUrl(v.base_url || "");
      setApiKey(v.api_key || "");
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "evolution",
          value: { base_url: baseUrl.trim().replace(/\/+$/, ""), api_key: apiKey.trim() },
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        },
        { onConflict: "key" }
      );
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configurações salvas!");
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Save first so the edge function reads the latest values
      await supabase.from("app_settings").upsert(
        {
          key: "evolution",
          value: { base_url: baseUrl.trim().replace(/\/+$/, ""), api_key: apiKey.trim() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      const { data, error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "test-connection" },
      });
      if (error) throw error;
      if (data?.ok) {
        setTestResult({ ok: true, message: `Conectado! ${data.instances ?? 0} instância(s) encontrada(s).` });
        toast.success("Conexão com Evolution OK");
      } else {
        setTestResult({ ok: false, message: data?.error || `Falha (status ${data?.status})` });
        toast.error("Falha na conexão");
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Erro desconhecido" });
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
          <Server className="w-5 h-5 text-primary" /> Evolution API (WhatsApp)
        </CardTitle>
        <CardDescription>
          Configurações globais usadas por todos os tenants para conectar instâncias do WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ev-url">URL Base</Label>
          <Input
            id="ev-url"
            placeholder="https://api.seudominio.com"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-key">Global API Key</Label>
          <Input
            id="ev-key"
            type="password"
            placeholder="••••••••"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-gradient-primary">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button onClick={handleTest} disabled={testing || !baseUrl || !apiKey} variant="outline" className="gap-2">
            <Plug className={`w-4 h-4 ${testing ? "animate-pulse" : ""}`} />
            {testing ? "Testando..." : "Testar conexão"}
          </Button>
        </div>
        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
              testResult.ok
                ? "border-green-500/30 bg-green-500/10 text-green-500"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span className="break-all">{testResult.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EvolutionSettingsCard;