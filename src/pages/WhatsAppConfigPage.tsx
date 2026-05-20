import { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, CheckCircle, AlertCircle, Save, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InboxTriggersConfig from "@/components/InboxTriggersConfig";

const WhatsAppConfigPage = () => {
  const [instance, setInstance] = useState<any>({
    name: "",
    status: "disconnected"
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchInstance();
  }, []);

  const fetchInstance = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("whatsapp_instances")
        .select("*")
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setInstance(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!instance.name) {
      toast.error("Informe um nome para o canal");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const instanceToSave: any = {
      name: instance.name,
      user_id: user.id,
      status: instance.status || "disconnected"
    };

    if (instance.id) {
      instanceToSave.id = instance.id;
    }

    const { error } = await supabase.from("whatsapp_instances").upsert(instanceToSave);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Nome do canal salvo!");
      fetchInstance();
    }
  };

  const handleConnect = async () => {
    if (!instance.name) {
      toast.error("Salve o nome do canal antes de conectar");
      return;
    }

    setConnecting(true);
    setQrCode(null);

    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution', {
        body: { 
          action: 'create-or-get-qr',
          instanceName: instance.name 
        }
      });

      if (error) throw error;

      if (data.status === 'connected') {
        toast.success("Instância já está conectada!");
        setInstance(prev => ({ ...prev, status: 'connected' }));
      } else if (data.qrcode) {
        const qr = data.qrcode.startsWith("data:") ? data.qrcode : `data:image/png;base64,${data.qrcode}`;
        setQrCode(qr);
        toast.success("QR Code gerado! Escaneie no seu WhatsApp.");
      } else {
        toast.error("Não foi possível gerar o QR Code. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Erro ao conectar:", err);
      toast.error(err.message || "Erro ao conectar");
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          WhatsApp (Evolution API)
        </h1>
        <p className="text-muted-foreground mt-1">Conecte seu número para automatizar o atendimento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Configuração do Canal</CardTitle>
            <CardDescription>Defina o nome que identificará sua conexão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channelName">Nome do Canal</Label>
              <Input 
                id="channelName"
                placeholder="Ex: WhatsApp Comercial" 
                value={instance.name} 
                onChange={e => setInstance({...instance, name: e.target.value})} 
              />
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-primary gap-2">
              <Save className="w-4 h-4" /> Salvar Nome
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Status da Conexão
              {instance.status === 'connected' ? (
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
              {instance.status === 'connected' 
                ? "Sua conta está conectada e pronta para uso." 
                : "Clique abaixo para gerar o QR Code e conectar."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[250px] space-y-4">
            {qrCode ? (
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border text-muted-foreground text-center p-4">
                {instance.status === 'connected' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Smartphone className="w-12 h-12 text-primary/50" />
                    <p className="text-xs">Aparelho conectado</p>
                  </div>
                ) : (
                  <p className="text-xs">O QR Code aparecerá aqui após clicar em gerar.</p>
                )}
              </div>
            )}
            <Button 
              onClick={handleConnect} 
              disabled={connecting} 
              className="w-full gap-2"
              variant={qrCode ? "outline" : "default"}
            >
              <RefreshCw className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} /> 
              {qrCode ? "Regerar QR Code" : "Gerar QR Code"}
            </Button>
            {instance.status === 'connected' && !qrCode && (
              <p className="text-[10px] text-muted-foreground text-center">
                Para trocar de número, gere um novo QR Code.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <InboxTriggersConfig />
      </div>
    </div>
  );
};

export default WhatsAppConfigPage;
