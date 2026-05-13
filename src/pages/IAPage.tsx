 import { useState, useEffect } from "react";
 import { Bot, Save, FileUp, Copy, Trash2, CheckCircle, Info } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { Slider } from "@/components/ui/slider";
 import { Switch } from "@/components/ui/switch";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 const DEFAULT_PROMPT = `Você é uma assistente virtual especializada em fotografia, chamada [Nome do Estúdio]. Seu tom é caloroso, profissional e entusiasmado com fotografia.
 
 Seu objetivo é:
 1. Entender o interesse do cliente (casamento, ensaio gestante, newborn, família, corporativo, etc.)
 2. Apresentar os serviços disponíveis
 3. Informar sobre preços e pacotes quando solicitado
 4. Agendar uma conversa com o fotógrafo quando o cliente demonstrar interesse
 5. Coletar: nome completo, tipo de interesse, data do evento, cidade e orçamento.
 
 Regras:
 - Seja breve e objetiva nas respostas (máximo 3 parágrafos)
 - Nunca invente preços, use sempre [ENVIAR_ARQUIVO: ID] para enviar a tabela de preços
 - Ao perceber que coletou as 5 informações necessárias, inclua o comando: [TRIAGEM_FEITA]`;
 
 const IAPage = () => {
   const [config, setConfig] = useState<any>({
     provider: "openai",
     model: "gpt-4o",
     api_key: "",
     temperature: 0.7,
     max_tokens: 1000,
     system_prompt: DEFAULT_PROMPT,
     is_active: true
   });
   const [files, setFiles] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     fetchData();
   }, []);
 
   const fetchData = async () => {
     setLoading(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;

       const { data: cfg } = await supabase.from("ai_config")
         .select("*")
         .eq('user_id', user.id)
         .maybeSingle();
       if (cfg) setConfig(cfg);
 
       const { data: fls } = await supabase.from("ai_files")
         .select("*")
         .eq('user_id', user.id);
       if (fls) setFiles(fls || []);
     } catch (err) {
       console.error(err);
     } finally {
       setLoading(false);
     }
   };
 
   const handleSaveConfig = async () => {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return;

     const configToSave = {
       ...config,
       user_id: user.id
     };

     // Remove id if it's not a valid UUID or if we want to ensure it's handled correctly
     if (configToSave.id && !configToSave.id.includes('-')) {
       delete configToSave.id;
     }

     const { error } = await supabase.from("ai_config").upsert(configToSave);
     if (error) toast.error("Erro ao salvar: " + error.message);
     else {
       toast.success("Configuração salva com sucesso!");
       fetchData();
     }
   };
 
   const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     const fileExt = file.name.split('.').pop();
     const fileName = `${Math.random()}.${fileExt}`;
     const filePath = `${fileName}`;
 
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return;

     const { data, error: uploadError } = await supabase.storage
       .from('ai-files')
       .upload(filePath, file);
 
     if (uploadError) {
       toast.error("Erro no upload: " + uploadError.message);
       return;
     }
 
     const { data: { publicUrl } } = supabase.storage.from('ai-files').getPublicUrl(filePath);
 
     const { error: dbError } = await supabase.from("ai_files").insert({
       name: file.name,
       file_url: publicUrl,
       file_type: fileExt || 'unknown',
       file_size_bytes: file.size,
       user_id: user.id
     });
 
     if (dbError) toast.error("Erro ao salvar no banco: " + dbError.message);
     else {
       toast.success("Arquivo enviado!");
       fetchData();
     }
   };
 
   return (
     <div className="space-y-6 pb-10">
       <div>
         <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
           <Bot className="w-8 h-8 text-primary" />
           Inteligência Artificial
         </h1>
         <p className="text-muted-foreground mt-1">Configure o cérebro do seu atendimento automático.</p>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="bg-card border-border">
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">Configurações do Provedor</CardTitle>
             <CardDescription>Escolha o motor da sua IA.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <Label>Provedor</Label>
               <div className="flex flex-wrap gap-2">
                 {["openai", "anthropic", "gemini", "groq"].map(p => (
                   <Button 
                     key={p}
                     variant={config.provider === p ? "default" : "outline"}
                     onClick={() => setConfig({...config, provider: p})}
                     className="capitalize"
                   >
                     {p}
                   </Button>
                 ))}
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Modelo</Label>
                 <Input value={config.model} onChange={e => setConfig({...config, model: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>API Key</Label>
                 <Input type="password" value={config.api_key} onChange={e => setConfig({...config, api_key: e.target.value})} />
               </div>
             </div>
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <Label>Temperatura: {config.temperature}</Label>
               </div>
               <Slider 
                 value={[config.temperature]} 
                 min={0} max={1} step={0.1} 
                 onValueChange={v => setConfig({...config, temperature: v[0]})} 
               />
             </div>
             <div className="flex items-center space-x-2">
               <Switch 
                 checked={config.is_active} 
                 onCheckedChange={v => setConfig({...config, is_active: v})} 
               />
               <Label>IA Ativa</Label>
             </div>
             <Button onClick={handleSaveConfig} className="w-full bg-gradient-primary gap-2">
               <Save className="w-4 h-4" /> Salvar Configuração
             </Button>
           </CardContent>
         </Card>
 
         <Card className="bg-card border-border">
           <CardHeader>
             <CardTitle className="text-lg">Arquivos da IA</CardTitle>
             <CardDescription>Arquivos que a IA pode enviar automaticamente.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="flex items-center gap-2">
               <Input type="file" onChange={handleUploadFile} className="hidden" id="file-upload" />
               <Label htmlFor="file-upload" className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors w-full justify-center border border-dashed border-primary/30">
                 <FileUp className="w-4 h-4 text-primary" /> Adicionar Arquivo
               </Label>
             </div>
             <div className="space-y-2 max-h-[300px] overflow-y-auto">
               {files.map(f => (
                 <div key={f.id} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg group">
                   <div className="min-w-0">
                     <p className="text-sm font-medium truncate">{f.name}</p>
                     <p className="text-[10px] text-muted-foreground font-mono">ID: {f.id}</p>
                   </div>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                       navigator.clipboard.writeText(`[ENVIAR_ARQUIVO: ${f.id}]`);
                       toast.success("Comando copiado!");
                     }}>
                       <Copy className="w-3 h-3" />
                     </Button>
                     <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => {
                        await supabase.from("ai_files").delete().eq("id", f.id);
                        fetchData();
                     }}>
                       <Trash2 className="w-3 h-3" />
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
 
         <Card className="bg-card border-border lg:col-span-2">
           <CardHeader>
             <CardTitle className="text-lg">Prompt do Sistema</CardTitle>
             <CardDescription>Defina a personalidade e as regras de atendimento.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <Textarea 
               value={config.system_prompt} 
               onChange={e => setConfig({...config, system_prompt: e.target.value})} 
               className="min-h-[300px] font-sans text-sm"
             />
             <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex gap-3 items-start">
               <Info className="w-4 h-4 text-primary mt-0.5" />
               <p className="text-xs text-muted-foreground">
                 Dica: Use <strong>[ENVIAR_ARQUIVO: id]</strong> para a IA enviar arquivos automaticamente e <strong>[TRIAGEM_FEITA]</strong> para mover o lead para a etapa de Triagem.
               </p>
             </div>
             <Button onClick={handleSaveConfig} className="bg-gradient-primary gap-2">
               <Save className="w-4 h-4" /> Salvar Prompt
             </Button>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
 export default IAPage;