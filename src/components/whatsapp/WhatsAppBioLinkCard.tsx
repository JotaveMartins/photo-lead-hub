import { useEffect, useState } from "react";
import { Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CRM_BIO_LINK_ORIGIN, DEFAULT_WHATSAPP_BIO_MESSAGE, normalizeBioPhone, validBioPhone, validBioSlug } from "@/lib/whatsappBioLink";

type SavedLink = { slug: string; phone: string; message: string };
type Props = { instances: { id: string; name: string; status: string | null; phone_number: string | null }[] };

export default function WhatsAppBioLinkCard({ instances }: Props) {
  const userId = useEffectiveUserId();
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [message, setMessage] = useState(DEFAULT_WHATSAPP_BIO_MESSAGE);
  const [saved, setSaved] = useState<SavedLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const connected = instances.filter(i => i.status === "connected" && i.phone_number && validBioPhone(normalizeBioPhone(i.phone_number)));
  const selectedInstance = connected.find(i => i.id === selectedInstanceId);
  const useConnectedNumber = (id: string) => {
    const instance = connected.find(i => i.id === id);
    if (!instance?.phone_number) return;
    setSelectedInstanceId(id);
    setPhone(`+${normalizeBioPhone(instance.phone_number)}`);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) return;
      setLoading(true);
      setLoadError(false);
      const { data, error } = await supabase.from("whatsapp_bio_links").select("slug,phone,message").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (error) setLoadError(true);
      else if (data) { setSaved(data); setSlug(data.slug); setPhone(`+${data.phone}`); setMessage(data.message); }
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [userId, attempt]);

  const save = async () => {
    const normalized = normalizeBioPhone(phone);
    if (!validBioSlug(slug)) { toast.error("Use de 3 a 50 letras minúsculas, números ou hífens. Comece e termine com letra ou número."); return; }
    if (!validBioPhone(normalized)) { toast.error("Informe um telefone válido com DDD. Para outros países, inclua + e o DDI."); return; }
    if (!message.trim() || message.length > 2000) { toast.error("Escreva uma mensagem de até 2.000 caracteres."); return; }
    if (!userId) return;
    if (saved && saved.slug !== slug && !window.confirm("Ao mudar o nome, o link anterior deixará de funcionar. Continuar?")) return;
    setSaving(true);
    const record = { slug, phone: normalized, message };
    const { error } = await supabase.from("whatsapp_bio_links").upsert({ user_id: userId, ...record }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.code === "23505" ? "Esse nome já está em uso. Escolha outro." : "Não foi possível salvar o link. Tente novamente."); return; }
    setSaved(record); setPhone(`+${normalized}`);
    toast.success("Link do WhatsApp salvo!");
  };
  const url = saved ? `${CRM_BIO_LINK_ORIGIN}/w/${saved.slug}` : "";
  const dirty = !!saved && (saved.slug !== slug || saved.phone !== normalizeBioPhone(phone) || saved.message !== message);

  return <Card className="bg-card border-border">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg"><LinkIcon className="w-5 h-5 text-primary" />Link do WhatsApp</CardTitle>
      <CardDescription>Crie um link Avanzo para a bio do Instagram com seu número e uma mensagem de entrada.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {loading ? <p className="text-sm text-muted-foreground">Carregando link...</p> : loadError ? <div className="space-y-2"><p role="alert">Não foi possível carregar o link do WhatsApp.</p><Button variant="outline" onClick={() => setAttempt(a => a + 1)}>Tentar novamente</Button></div> : <>
        {connected.length > 0 && <div className="space-y-2">
          {connected.length === 1 ? <Button type="button" variant="outline" className="h-auto whitespace-normal text-left" disabled={saving} onClick={() => useConnectedNumber(connected[0].id)}>
            Usar número conectado: {connected[0].name} (+{normalizeBioPhone(connected[0].phone_number!)})
          </Button> : <>
            <Label htmlFor="bio-instance">Usar um número conectado</Label>
            <Select value={selectedInstance?.id ?? ""} disabled={saving} onValueChange={useConnectedNumber}>
              <SelectTrigger id="bio-instance"><SelectValue placeholder="Selecione o canal para preencher o telefone" /></SelectTrigger>
              <SelectContent>{connected.map(i => <SelectItem key={i.id} value={i.id}>{i.name} (+{normalizeBioPhone(i.phone_number!)})</SelectItem>)}</SelectContent>
            </Select>
          </>}
          {selectedInstance && <p role="status" className="text-sm text-primary">Número de {selectedInstance.name} preenchido abaixo. Você já pode criar ou salvar o link.</p>}
        </div>}
        <div className="space-y-2"><Label htmlFor="bio-phone">WhatsApp com DDD</Label><Input id="bio-phone" type="tel" placeholder="(61) 99999-9999" value={phone} onChange={e => { setSelectedInstanceId(""); setPhone(e.target.value); }} disabled={saving} /><p className="text-xs text-muted-foreground">Números brasileiros recebem o DDI 55. Para outro país, informe + e o DDI.</p></div>
        <div className="space-y-2"><Label htmlFor="bio-slug">Nome no link</Label><Input id="bio-slug" placeholder="renato" maxLength={50} value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} disabled={saving} /><p className="text-xs text-muted-foreground break-all">{CRM_BIO_LINK_ORIGIN}/w/{slug || "seu-nome"}</p></div>
        <div className="space-y-2"><Label htmlFor="bio-message">Mensagem de entrada</Label><Textarea id="bio-message" value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} disabled={saving} /></div>
        <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : saved ? "Salvar alterações" : "Criar link"}</Button>
        {dirty && <p className="text-sm text-muted-foreground">Salve para atualizar o link. Até lá, ele usa o número e a mensagem anteriores.</p>}
        {saved && <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-sm break-all">{url}</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success("Link copiado!"); } catch { toast.error("Não foi possível copiar. Selecione o endereço acima."); } }}><Copy className="mr-2 w-4 h-4" />Copiar link</Button>
          <Button variant="outline" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 w-4 h-4" />Testar link</a></Button></div>
        </div>}
      </>}
    </CardContent>
  </Card>;
}
