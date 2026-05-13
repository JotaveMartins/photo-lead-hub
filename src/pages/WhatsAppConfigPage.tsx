 import { useState, useEffect } from "react";
 import { MessageSquare, RefreshCw, Unplug, CheckCircle, AlertCircle, Copy, Save } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 const WhatsAppConfigPage = () => {
   const [instance, setInstance] = useState<any>({
     name: "",
     instance_key: "",
     base_url: "",
     api_key: "",
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
       const { data } = await supabase.from("whatsapp_instances").select("*").maybeSingle();
       if (data) setInstance(data);
     } catch (err) {
       console.error(err);
     } finally {
       setLoading(false);
     }
   };
 
   const handleSave = async () => {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return;

     const instanceToSave = {
       ...instance,
       user_id: user.id
     };

     if (instanceToSave.id && !instanceToSave.id.includes('-')) {
       delete instanceToSave.id;
     }

     const { error } = await supabase.from("whatsapp_instances").upsert(instanceToSave);
     if (error) toast.error("Erro ao salvar: " + error.message);
     else {
       toast.success("Configurações salvas!");
       fetchInstance();
     }
   };
 
   const handleConnect = async () => {
     if (!instance.name || !instance.base_url || !instance.api_key) {
       toast.error("Preencha todos os campos antes de conectar");
       return;
     }
     setConnecting(true);
     try {
       // 1. Create instance if not exists
       const createResp = await fetch(`${instance.base_url}/instance/create`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "apikey": instance.api_key
         },
         body: JSON.stringify({ instanceName: instance.name })
       });
       
       // 2. Get QR Code
       const connectResp = await fetch(`${instance.base_url}/instance/connect/${instance.name}`, {
         method: "GET",
         headers: { "apikey": instance.api_key }
       });
       const result = await connectResp.json();
       if (result.base64) {
         setQrCode(result.base64);
         toast.success("QR Code gerado! Escaneie no seu WhatsApp.");
       } else {
         toast.error("Erro ao gerar QR Code");
       }
     } catch (err) {
       toast.error("Erro ao conectar: " + err.message);
     } finally {
       setConnecting(false);
     }
   };
 
   const webhookUrl = `${window.location.origin.replace('lovable.app', 'supabase.co')}/functions/v1/evolution-webhook`;
 
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
             <CardTitle className="text-lg">Configuração da API</CardTitle>
             <CardDescription>Dados da sua instância Evolution.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <Label>URL Base</Label>
               <Input placeholder="https://api.seudominio.com" value={instance.base_url} onChange={e => setInstance({...instance, base_url: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>API Key</Label>
               <Input type="password" value={instance.api_key} onChange={e => setInstance({...instance, api_key: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Nome da Instância</Label>
               <Input placeholder="ex: fotografo-hub" value={instance.name} onChange={e => setInstance({...instance, name: e.target.value})} />
             </div>
             <Button onClick={handleSave} className="w-full bg-gradient-primary gap-2">
               <Save className="w-4 h-4" /> Salvar Configurações
             </Button>
           </CardContent>
         </Card>
 
         <Card className="bg-card border-border">
           <CardHeader>
             <CardTitle className="text-lg flex items-center justify-between">
               Conexão
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
             <CardDescription>Escaneie o QR Code para conectar.</CardDescription>
           </CardHeader>
           <CardContent className="flex flex-col items-center justify-center min-h-[250px] space-y-4">
             {qrCode ? (
               <div className="bg-white p-4 rounded-lg">
                 <img src={qrCode} alt="QR Code" className="w-48 h-48" />
               </div>
             ) : (
               <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border text-muted-foreground text-center p-4">
                 <p className="text-xs">Escaneie o QR Code aqui após clicar em conectar.</p>
               </div>
             )}
             <Button onClick={handleConnect} disabled={connecting} className="w-full gap-2">
               <RefreshCw className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} /> 
               {qrCode ? "Regerar QR Code" : "Conectar / Gerar QR Code"}
             </Button>
           </CardContent>
         </Card>
 
         <Card className="bg-card border-border md:col-span-2">
           <CardHeader>
             <CardTitle className="text-lg">Webhook</CardTitle>
             <CardDescription>Configure esta URL na sua Evolution API para receber as mensagens.</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center gap-2 bg-muted p-3 rounded-md border border-border">
               <code className="text-xs flex-1 truncate">{webhookUrl}</code>
               <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                 navigator.clipboard.writeText(webhookUrl);
                 toast.success("Webhook copiado!");
               }}>
                 <Copy className="w-4 h-4" />
               </Button>
             </div>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
 export default WhatsAppConfigPage;