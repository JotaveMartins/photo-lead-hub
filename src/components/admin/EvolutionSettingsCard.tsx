import { useEffect, useState } from "react";
import { Save, Server } from "lucide-react";
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
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-gradient-primary">
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EvolutionSettingsCard;