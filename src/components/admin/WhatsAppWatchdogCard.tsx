import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type InstanceState = {
  name?: string;
  status: "ok" | "delayed" | "silent" | "closed";
  reason: string | null;
  needs_reconnect: boolean;
  restarts: string[];
  checked_at: string | null;
};
type WatchdogValue = { updated_at?: string; instances?: Record<string, InstanceState> };

const STATUS_LABEL: Record<InstanceState["status"], string> = {
  ok: "Em dia",
  delayed: "Atrasado",
  silent: "Silencioso",
  closed: "Sessão fechada",
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";

const WhatsAppWatchdogCard = () => {
  const [value, setValue] = useState<WatchdogValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "whatsapp_watchdog").maybeSingle();
    setValue((data?.value as WatchdogValue) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-watchdog", { body: {} });
      if (error) throw error;
      const problems = data?.problems?.length ?? 0;
      toast.success(problems ? `${problems} conexão(ões) com problema — ações aplicadas` : "Todas as conexões em dia");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao verificar");
    } finally {
      setRunning(false);
    }
  };

  const rows = Object.entries(value?.instances ?? {})
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => Number(b.needs_reconnect) - Number(a.needs_reconnect) || Number(b.status !== "ok") - Number(a.status !== "ok") || (a.name ?? "").localeCompare(b.name ?? ""));

  return (
    <Card className="bg-card border-border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Vigia do WhatsApp
        </CardTitle>
        <CardDescription>
          A cada 10 minutos verifica se as mensagens estão chegando em dia e reinicia sozinho as conexões travadas.
          Quando reiniciar não resolve, a conexão aparece como "Reconectar QR".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Última verificação: {fmt(value?.updated_at)}</span>
          <Button size="sm" variant="outline" onClick={runNow} disabled={running} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Verificando..." : "Verificar agora"}
          </Button>
        </div>
        {loading ? (
          <div className="text-muted-foreground text-sm">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground text-sm">Nenhuma verificação registrada ainda.</div>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{r.name ?? r.id}</div>
                  {r.reason && <div className="text-muted-foreground text-xs">{r.reason}</div>}
                  {r.restarts.length > 0 && (
                    <div className="text-muted-foreground text-xs">
                      {r.restarts.length} reinício(s) automático(s) em 24 h · último {fmt(r.restarts[r.restarts.length - 1])}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={r.status === "ok" ? "secondary" : "destructive"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  {r.needs_reconnect && <Badge variant="outline" className="border-destructive text-destructive">Reconectar QR</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppWatchdogCard;
