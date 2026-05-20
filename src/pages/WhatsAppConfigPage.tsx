import { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, CheckCircle, AlertCircle, Plus, Trash2, Power, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InboxTriggersConfig from "@/components/InboxTriggersConfig";

type Instance = {
  id: string;
  name: string;
  status: string | null;
  phone_number: string | null;
  user_id: string;
};

const WhatsAppConfigPage = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [transferFrom, setTransferFrom] = useState<Instance | null>(null);
  const [transferTarget, setTransferTarget] = useState<string>("");

  const fetchInstances = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("whatsapp_instances")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: true });
    setInstances((data as Instance[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstances();
    const channel = supabase
      .channel("whatsapp_instances_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_instances" }, () => {
        fetchInstances();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Poll Evolution for any instance currently showing a QR
  useEffect(() => {
    const pending = Object.keys(qrCodes);
    if (pending.length === 0) return;
    const interval = setInterval(async () => {
      for (const id of pending) {
        const inst = instances.find(i => i.id === id);
        if (!inst) continue;
        try {
          const { data } = await supabase.functions.invoke("manage-evolution", {
            body: { action: "check-status", instanceName: inst.name, instanceId: inst.id }
          });
          if (data?.status === "connected") {
            setQrCodes(prev => { const n = { ...prev }; delete n[id]; return n; });
            toast.success(`WhatsApp conectado: +${data.phoneNumber || ""}`);
            fetchInstances();
          }
        } catch (_) { /* ignore */ }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrCodes, instances]);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Informe um nome"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("whatsapp_instances").insert({
      name: newName.trim(), user_id: user.id, status: "disconnected"
    });
    if (error) { toast.error(error.message); return; }
    setNewName(""); setShowAdd(false);
    toast.success("Canal criado!");
    fetchInstances();
  };

  const handleConnect = async (inst: Instance) => {
    setBusy(b => ({ ...b, [inst.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "create-or-get-qr", instanceName: inst.name, instanceId: inst.id }
      });
      if (error) throw error;
      if (data.status === "connected") {
        toast.success("Já está conectado!"); fetchInstances();
      } else if (data.qrcode) {
        const qr = data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
        setQrCodes(prev => ({ ...prev, [inst.id]: qr }));
        toast.success("QR Code gerado! Escaneie no WhatsApp.");
      } else {
        toast.error("Não foi possível gerar o QR Code.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar");
    } finally {
      setBusy(b => ({ ...b, [inst.id]: false }));
    }
  };

  const handleDisconnect = async (inst: Instance) => {
    setBusy(b => ({ ...b, [inst.id]: true }));
    try {
      await supabase.functions.invoke("manage-evolution", {
        body: { action: "disconnect", instanceName: inst.name, instanceId: inst.id }
      });
      setQrCodes(prev => { const n = { ...prev }; delete n[inst.id]; return n; });
      toast.success("Número desconectado.");
      fetchInstances();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar");
    } finally {
      setBusy(b => ({ ...b, [inst.id]: false }));
    }
  };

  const handleDelete = async (inst: Instance) => {
    setBusy(b => ({ ...b, [inst.id]: true }));
    try {
      const { error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "delete", instanceName: inst.name, instanceId: inst.id }
      });
      if (error) throw error;
      toast.success("Canal excluído.");
      fetchInstances();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    } finally {
      setBusy(b => ({ ...b, [inst.id]: false }));
    }
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTarget) return;
    try {
      const { error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "transfer", instanceId: transferFrom.id, targetInstanceId: transferTarget }
      });
      if (error) throw error;
      toast.success("Atendimentos transferidos!");
      setTransferFrom(null); setTransferTarget("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao transferir");
    }
  };

  const handleReconfigureWebhook = async (inst: Instance) => {
    setBusy(b => ({ ...b, [inst.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-evolution", {
        body: { action: "set-webhook", instanceName: inst.name, instanceId: inst.id }
      });
      if (error) throw error;
      toast.success("Webhook reconfigurado! Envie uma mensagem para testar.");
      console.log("Webhook resp:", data);
    } catch (err: any) {
      toast.error(err.message || "Erro ao reconfigurar webhook");
    } finally {
      setBusy(b => ({ ...b, [inst.id]: false }));
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
              <Input id="newChan" placeholder="Ex: WhatsApp Comercial"
                value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button onClick={handleAdd}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            const qr = qrCodes[inst.id];
            const connected = inst.status === "connected";
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
                      ? (inst.phone_number ? `Número: +${inst.phone_number}` : "Conectado")
                      : "Gere o QR Code para conectar este canal."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-3">
                  {connected ? (
                    <div className="w-44 h-44 bg-muted rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-green-500/40 text-center p-4 gap-2">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                      {inst.phone_number && (
                        <p className="text-sm font-semibold text-foreground">+{inst.phone_number}</p>
                      )}
                    </div>
                  ) : qr ? (
                    <div className="bg-white p-3 rounded-lg shadow-inner">
                      <img src={qr} alt="QR Code" className="w-44 h-44" />
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
                      <Button variant="outline" onClick={() => handleDisconnect(inst)} disabled={busy[inst.id]} className="gap-2 col-span-2">
                        <Power className="w-4 h-4" /> Desconectar
                      </Button>
                    )}
                    {connected && (
                      <Button variant="outline" onClick={() => handleReconfigureWebhook(inst)} disabled={busy[inst.id]} className="gap-2 col-span-2">
                        <RefreshCw className="w-4 h-4" /> Reconfigurar webhook
                      </Button>
                    )}
                    {instances.length > 1 && (
                      <Button variant="outline" className="gap-2"
                        onClick={() => { setTransferFrom(inst); setTransferTarget(""); }}>
                        <ArrowRightLeft className="w-4 h-4" /> Transferir
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className={`gap-2 text-destructive hover:text-destructive ${instances.length > 1 ? "" : "col-span-2"}`}>
                          <Trash2 className="w-4 h-4" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir canal "{inst.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            <strong className="text-destructive">Atenção:</strong> ao excluir este canal, <strong>todas as conversas e mensagens vinculadas a ele serão perdidas permanentemente</strong>.
                            <br /><br />
                            Se quiser preservar o histórico, use a opção <strong>Transferir</strong> para mover os atendimentos para outro canal antes de excluir.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(inst)}>
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
              Mova todas as conversas do canal <strong>{transferFrom?.name}</strong> para outro canal. As mensagens passarão a aparecer no canal destino.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Canal destino</Label>
            <select
              className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm"
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
            >
              <option value="">Selecione...</option>
              {instances.filter(i => i.id !== transferFrom?.id).map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.phone_number ? `(+${i.phone_number})` : ""}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferFrom(null)}>Cancelar</Button>
            <Button onClick={handleTransfer} disabled={!transferTarget}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        <InboxTriggersConfig />
      </div>
    </div>
  );
};

export default WhatsAppConfigPage;
