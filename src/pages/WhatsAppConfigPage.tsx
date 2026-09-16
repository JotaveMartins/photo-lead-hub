import { useState, useEffect, useRef } from "react";
import {
  MessageSquare, RefreshCw, CheckCircle, AlertCircle, Plus, Trash2,
  Power, ArrowRightLeft, Activity, MessageCircle, Clock, AlertTriangle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useUserRole } from "@/hooks/useUserRole";
import { useInstanceStats } from "@/hooks/useInstanceStats";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Instance = {
  id: string;
  name: string;
  status: string | null;
  phone_number: string | null;
  user_id: string;
  qr_code: string | null;
  qr_code_updated_at: string | null;
};

// Baileys/WhatsApp QR codes rotate roughly every 20-60s. We refresh a bit
// ahead of that so the code on screen is (almost) never expired — Evolution
// also pushes fresh codes via the QRCODE_UPDATED webhook in real time, this
// timer is just the guaranteed fallback when that event doesn't arrive.
const QR_REFRESH_MS = 25_000;

const WhatsAppConfigPage = () => {
  const effectiveUserId = useEffectiveUserId();
  const { isAdmin } = useUserRole();
  const [resolvingContacts, setResolvingContacts] = useState(false);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [transferFrom, setTransferFrom] = useState<Instance | null>(null);
  const [transferTarget, setTransferTarget] = useState<string>("");
  const instancesRef = useRef(instances);
  instancesRef.current = instances;
  const [now, setNow] = useState(() => Date.now());

  const { data: instanceStats = [] } = useInstanceStats();

  // Ticks once a second, only while a QR is actually on screen, to drive the
  // "novo QR em Xs" countdown under the image.
  const hasVisibleQr = instances.some((i) => i.status === "connecting" && i.qr_code);
  useEffect(() => {
    if (!hasVisibleQr) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [hasVisibleQr]);

  const handleResolveContacts = async () => {
    if (!effectiveUserId) return;
    setResolvingContacts(true);
    try {
      const { data, error } = await supabase.functions.invoke("resolve-lid-contacts", {
        body: { user_id: effectiveUserId, limit: 30 },
      });
      if (error) throw error;
      const updated = data?.updated ?? 0;
      toast.success(
        updated > 0
          ? `${updated} contato(s) atualizados com o número real.`
          : "Nenhum número novo foi identificado.",
      );
    } catch (e: any) {
      toast.error("Erro ao atualizar contatos: " + (e?.message || "tente novamente"));
    } finally {
      setResolvingContacts(false);
    }
  };

  const fetchInstances = async () => {
    if (!effectiveUserId) return;
    const { data } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: true });
    setInstances((data as Instance[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (effectiveUserId) {
      fetchInstances();
      const channel = supabase
        .channel("whatsapp_instances_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_instances" }, fetchInstances)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [effectiveUserId]);

  // Poll connection status while a QR is pending — realtime (via the
  // CONNECTION_UPDATE webhook) is the primary path, this is the fallback for
  // when the webhook doesn't arrive.
  const connectingKey = instances.filter((i) => i.status === "connecting").map((i) => i.id).join(",");
  useEffect(() => {
    const pending = instancesRef.current.filter((i) => i.status === "connecting");
    if (pending.length === 0) return;
    const interval = setInterval(async () => {
      for (const inst of instancesRef.current.filter((i) => i.status === "connecting")) {
        try {
          const { data } = await supabase.functions.invoke("manage-evolution", {
            body: { action: "check-status", instanceName: inst.name, instanceId: inst.id },
          });
          if (data?.status === "connected") {
            toast.success(`WhatsApp conectado: +${data.phoneNumber || ""}`);
            fetchInstances();
          }
        } catch (_) { /* ignore poll errors */ }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [connectingKey]);

  // Auto-refresh the QR image itself before it expires, regardless of
  // whether Evolution's QRCODE_UPDATED webhook actually arrives — this is
  // what fixes QR scans failing "only inside the tool" (a stale, expired
  // code stuck on screen with no auto-refresh).
  const qrRefreshKey = instances
    .filter((i) => i.status === "connecting")
    .map((i) => `${i.id}:${i.qr_code_updated_at}`)
    .join(",");
  useEffect(() => {
    const connecting = instancesRef.current.filter((i) => i.status === "connecting");
    if (connecting.length === 0) return;
    const timers = connecting.map((inst) => {
      const age = inst.qr_code_updated_at ? Date.now() - new Date(inst.qr_code_updated_at).getTime() : Infinity;
      const delay = Math.max(QR_REFRESH_MS - age, 1000);
      return setTimeout(() => {
        const current = instancesRef.current.find((i) => i.id === inst.id);
        if (current?.status === "connecting") handleConnect(current, { silent: true });
      }, delay);
    });
    return () => timers.forEach(clearTimeout);
  }, [qrRefreshKey]);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Informe um nome"); return; }
    if (!effectiveUserId) return;
    const { error } = await supabase.from("whatsapp_instances").insert({
      name: newName.trim(), user_id: effectiveUserId, status: "disconnected",
    });
    if (error) { toast.error(error.message); return; }
    setNewName(""); setShowAdd(false);
    toast.success("Canal criado!");
    fetchInstances();
  };

  const handleConnect = async (inst: Instance, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setBusy((b) => ({ ...b, [inst.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "create-or-get-qr", instanceName: inst.name, instanceId: inst.id },
      });
      if (error) throw error;
      if (data.status === "connected") {
        if (!silent) toast.success("Já está conectado!");
        fetchInstances();
      } else if (data.qrcode) {
        const qr = data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
        // Optimistic local update so the (possibly just-regenerated) QR shows
        // instantly, without waiting on a realtime round-trip.
        setInstances((prev) => prev.map((i) => (
          i.id === inst.id
            ? { ...i, status: "connecting", qr_code: qr, qr_code_updated_at: new Date().toISOString() }
            : i
        )));
        if (!silent) toast.success("QR Code gerado! Escaneie no WhatsApp.");
      } else if (!silent) {
        toast.error("Não foi possível gerar o QR Code.");
      }
    } catch (err: any) {
      if (!silent) toast.error(err.message || "Erro ao conectar");
    } finally {
      if (!silent) setBusy((b) => ({ ...b, [inst.id]: false }));
    }
  };

  const handleDisconnect = async (inst: Instance) => {
    setBusy((b) => ({ ...b, [inst.id]: true }));
    try {
      await supabase.functions.invoke("manage-evolution", {
        body: { action: "disconnect", instanceName: inst.name, instanceId: inst.id },
      });
      toast.success("Número desconectado.");
      fetchInstances();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar");
    } finally {
      setBusy((b) => ({ ...b, [inst.id]: false }));
    }
  };

  const handleRefreshStatus = async (inst: Instance) => {
    setBusy((b) => ({ ...b, [inst.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "check-status", instanceName: inst.name, instanceId: inst.id },
      });
      if (error) throw error;
      await fetchInstances();
      toast.success(data?.status === "connected" ? "Conectado!" : "Status atualizado.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao verificar status");
    } finally {
      setBusy((b) => ({ ...b, [inst.id]: false }));
    }
  };

  const handleDelete = async (inst: Instance) => {
    setBusy((b) => ({ ...b, [inst.id]: true }));
    try {
      const { error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "delete", instanceName: inst.name, instanceId: inst.id },
      });
      if (error) throw error;
      toast.success("Canal excluído.");
      fetchInstances();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    } finally {
      setBusy((b) => ({ ...b, [inst.id]: false }));
    }
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTarget) return;
    try {
      const { error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "transfer", instanceId: transferFrom.id, targetInstanceId: transferTarget },
      });
      if (error) throw error;
      toast.success("Atendimentos transferidos!");
      setTransferFrom(null); setTransferTarget("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao transferir");
    }
  };

  const handleReconfigureWebhook = async (inst: Instance) => {
    setBusy((b) => ({ ...b, [inst.id]: true }));
    try {
      const { error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "set-webhook", instanceName: inst.name, instanceId: inst.id },
      });
      if (error) throw error;
      toast.success("Webhook reconfigurado! Envie uma mensagem para testar.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao reconfigurar webhook");
    } finally {
      setBusy((b) => ({ ...b, [inst.id]: false }));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            WhatsApp (Evolution API)
          </h1>
          <p className="text-muted-foreground mt-1">Conecte um ou mais números para automatizar o atendimento.</p>
        </div>
        <div className="flex items-center gap-2">
        {isAdmin && (
          <Button variant="outline" className="gap-2" onClick={handleResolveContacts} disabled={resolvingContacts}>
            {resolvingContacts ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Atualizar contatos
          </Button>
        )}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo canal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar novo canal</DialogTitle>
              <DialogDescription>Cada canal corresponde a um número de WhatsApp.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="newChan">Nome do canal</Label>
              <Input
                id="newChan"
                placeholder="Ex: WhatsApp Comercial"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button onClick={handleAdd}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-lg border border-status-warning/20 bg-status-warning/10 p-4 text-sm text-status-warning flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">Aviso importante</p>
          <p>
            A conexão com o WhatsApp não é feita via API Oficial (que gera custos), então existe uma chance de o seu número ser bloqueado por 24 horas caso ele não seja antigo ou já tenha recebido outros bloqueios.
          </p>
          <p>
            Não nos responsabilizamos por esses bloqueios, vistos que eles dependem do uso do usuário (enviar mensagens em massa aumentam a chance de bloqueios).
          </p>
        </div>
      </div>

      {instances.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum canal criado. Clique em "Novo canal" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {instances.map((inst) => {
            const qr = inst.status === "connecting" ? inst.qr_code : null;
            const connected = inst.status === "connected";
            const stat = instanceStats.find((s) => s.instance_id === inst.id);
            const secondsToRefresh = qr && inst.qr_code_updated_at
              ? Math.max(0, Math.ceil((QR_REFRESH_MS - (now - new Date(inst.qr_code_updated_at).getTime())) / 1000))
              : null;

            return (
              <Card key={inst.id} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="truncate">{inst.name}</span>
                    {connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-500 font-normal">
                        <CheckCircle className="w-3 h-3" /> Conectado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-destructive font-normal">
                        <AlertCircle className="w-3 h-3" /> Desconectado
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {connected
                      ? inst.phone_number ? `+${inst.phone_number}` : "Conectado"
                      : "Gere o QR Code para conectar."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-3">
                  {connected ? (
                    <div className="w-full bg-muted/30 rounded-lg border border-green-500/20 p-4">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        {inst.phone_number && (
                          <p className="text-base font-semibold text-foreground">+{inst.phone_number}</p>
                        )}
                      </div>
                      {/* Stats row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background rounded-md p-2">
                          <MessageCircle className="w-3.5 h-3.5 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{stat?.msgs_today ?? 0}</p>
                            <p>msgs hoje</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background rounded-md p-2">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <div>
                            <p className="font-medium text-foreground text-[11px] leading-tight">
                              {stat?.last_activity
                                ? formatDistanceToNow(new Date(stat.last_activity), { locale: ptBR, addSuffix: true })
                                : "—"}
                            </p>
                            <p>atividade</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : qr ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="bg-white p-3 rounded-lg shadow-inner">
                        <img src={qr} alt="QR Code" className="w-44 h-44" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {secondsToRefresh !== null && secondsToRefresh > 0
                          ? `Novo QR Code em ${secondsToRefresh}s`
                          : "Gerando novo QR Code..."}
                      </p>
                    </div>
                  ) : (
                    <div className="w-44 h-44 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border text-muted-foreground text-center p-4">
                      <p className="text-xs">Clique em "Gerar QR" para conectar.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 w-full">
                    {!connected && (
                      <Button onClick={() => handleConnect(inst)} disabled={busy[inst.id]} className="gap-2 col-span-2">
                        <RefreshCw className={`w-4 h-4 ${busy[inst.id] ? "animate-spin" : ""}`} />
                        {qr ? "Regerar QR" : "Gerar QR"}
                      </Button>
                    )}
                    {connected && (
                      <>
                        <Button variant="outline" onClick={() => handleRefreshStatus(inst)} disabled={busy[inst.id]} className="gap-2">
                          <Activity className="w-4 h-4" /> Verificar
                        </Button>
                        <Button variant="outline" onClick={() => handleDisconnect(inst)} disabled={busy[inst.id]} className="gap-2">
                          <Power className="w-4 h-4" /> Desconectar
                        </Button>
                        <Button variant="outline" onClick={() => handleReconfigureWebhook(inst)} disabled={busy[inst.id]} className="gap-2 col-span-2">
                          <RefreshCw className="w-4 h-4" /> Reconfigurar webhook
                        </Button>
                      </>
                    )}
                    {instances.length > 1 && (
                      <Button
                        variant="outline" className="gap-2"
                        onClick={() => { setTransferFrom(inst); setTransferTarget(""); }}
                      >
                        <ArrowRightLeft className="w-4 h-4" /> Transferir
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className={`gap-2 text-destructive hover:text-destructive ${instances.length > 1 ? "" : "col-span-2"}`}
                        >
                          <Trash2 className="w-4 h-4" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir canal "{inst.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong className="text-destructive">Atenção:</strong> ao excluir este canal,{" "}
                            <strong>todas as conversas e mensagens vinculadas serão perdidas permanentemente</strong>.
                            <br /><br />
                            Se quiser preservar o histórico, use <strong>Transferir</strong> antes de excluir.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(inst)}
                          >
                            Excluir definitivamente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transfer dialog */}
      <Dialog open={!!transferFrom} onOpenChange={(open) => !open && setTransferFrom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir atendimentos</DialogTitle>
            <DialogDescription>
              Mova todas as conversas do canal <strong>{transferFrom?.name}</strong> para outro canal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Canal destino</Label>
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {instances
                  .filter((i) => i.id !== transferFrom?.id)
                  .map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} {i.phone_number ? `(+${i.phone_number})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferFrom(null)}>Cancelar</Button>
            <Button onClick={handleTransfer} disabled={!transferTarget}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default WhatsAppConfigPage;
