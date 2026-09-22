import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronRight, Eye, Send, Settings, Trash2, UploadCloud, Plus, Images,
  Share2, Pencil, Check, X, Copy, Camera, CalendarDays, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ClienteSearchSelect from "@/components/ClienteSearchSelect";
import SearchSelect from "@/components/SearchSelect";
import DatePickerField from "@/components/DatePickerField";
import { useClientes } from "@/hooks/useClientes";
import { useEntrega, useUpdateEntrega } from "@/hooks/useEntregas";
import { parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";
import {
  useGallery, useGallerySections, useGalleryMedia, useUpdateGallery, useDeleteGallery,
  useCreateSection, useUpdateSection, useDeleteSection, formatBytes,
} from "@/hooks/useGalleries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fmt = (d?: string | null) => (d ? format(parseLocalDate(d), "dd/MM/yyyy") : null);

const GaleriaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: gallery, isLoading } = useGallery(id);
  const { data: sections = [] } = useGallerySections(id);
  const { data: media = [] } = useGalleryMedia(id);
  const { data: entrega } = useEntrega(gallery?.entrega_id);
  const { data: clientes = [] } = useClientes();
  const updateGallery = useUpdateGallery();
  const deleteGallery = useDeleteGallery();
  const updateEntrega = useUpdateEntrega();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();

  const [tab, setTab] = useState("fotos");
  const [activeSection, setActiveSection] = useState<string>("all");
  const [newSection, setNewSection] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Configurações
  const [name, setName] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [expiraDias, setExpiraDias] = useState("0");
  const [download, setDownload] = useState(true);
  const [senha, setSenha] = useState("");
  const [coverId, setCoverId] = useState("");

  useEffect(() => {
    if (!gallery) return;
    setName(gallery.name);
    setClienteId(gallery.cliente_id ?? "");
    setEventDate(gallery.event_date ?? "");
    setDownload(gallery.download_enabled);
    setCoverId(gallery.cover_media_id ?? "");
    setExpiraDias(
      gallery.expires_at
        ? String(Math.max(0, Math.ceil((new Date(gallery.expires_at).getTime() - Date.now()) / 86400000)))
        : "0",
    );
  }, [gallery]);

  if (isLoading) {
    return <p className="py-20 text-center text-sm text-muted-foreground animate-pulse">Carregando...</p>;
  }
  if (!gallery) {
    return <p className="py-20 text-center text-sm text-muted-foreground">Entrega não encontrada.</p>;
  }

  const published = gallery.status === "published";
  const publicUrl = `${window.location.origin}/g/${gallery.slug}`;
  const visibleMedia = activeSection === "all" ? media : media.filter((m) => m.section_id === activeSection);

  const handlePublish = () => {
    updateGallery.mutate(
      { id: gallery.id, status: "published", published_at: new Date().toISOString() },
      { onSuccess: () => toast.success("Galeria publicada!") },
    );
  };

  const handleCreateSection = () => {
    if (!newSection.trim()) return;
    createSection.mutate(
      { galleryId: gallery.id, name: newSection.trim(), sortOrder: sections.length },
      { onSuccess: () => { setNewSection(""); setAddingSection(false); } },
    );
  };

  const handleSaveSettings = async () => {
    const expires_at =
      Number(expiraDias) > 0 ? new Date(Date.now() + Number(expiraDias) * 86400000).toISOString() : null;
    await updateGallery.mutateAsync({
      id: gallery.id,
      name: name.trim() || gallery.name,
      cliente_id: clienteId || null,
      event_date: eventDate || null,
      download_enabled: download,
      cover_media_id: coverId || null,
      expires_at,
    });
    if (senha.trim()) {
      if (senha.trim().length < 4) {
        toast.error("A senha precisa ter ao menos 4 caracteres");
        return;
      }
      const { error } = await supabase.rpc("set_gallery_password", {
        _gallery_id: gallery.id,
        _password: senha.trim(),
      });
      if (error) { toast.error("Erro ao salvar a senha"); return; }
      setSenha("");
    }
    toast.success("Configurações salvas");
  };

  const marcarEntregue = async () => {
    if (!entrega) return;
    await updateEntrega.mutateAsync({
      id: entrega.id,
      etapa: "Entregue",
      data_entrega_final: entrega.data_entrega_final ?? format(new Date(), "yyyy-MM-dd"),
    });
    toast.success("Entrega marcada como entregue");
    setShareOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <button onClick={() => navigate("/entregas")} className="hover:text-foreground">Entregas</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{gallery.name}</span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">{gallery.name}</h1>
            {entrega && <Badge variant="secondary">{entrega.etapa}</Badge>}
            {published && <Badge>Publicada</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(gallery.clientes?.nome || entrega?.clientes?.nome) && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {gallery.clientes?.nome || entrega?.clientes?.nome}
              </span>
            )}
            {entrega?.services?.nome && (
              <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {entrega.services.nome}</span>
            )}
            {(gallery.event_date || entrega?.data_ensaio) && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> {fmt(gallery.event_date || entrega?.data_ensaio)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {gallery.media_count} fotos · {formatBytes(gallery.storage_bytes)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!published || !media.length} onClick={() => window.open(publicUrl, "_blank")}>
            <Eye className="mr-2 h-4 w-4" /> Pré-visualizar
          </Button>
          <Button onClick={handlePublish} disabled={published || updateGallery.isPending}>
            <Send className="mr-2 h-4 w-4" /> Publicar
          </Button>
          <Button variant="outline" disabled={!published} onClick={() => setShareOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar
          </Button>
          <Button variant="outline" onClick={() => setTab("config")}>
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </Button>
          <Button variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="fotos" className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSection("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {sections.map((s) =>
              renamingId === s.id ? (
                <div key={s.id} className="flex items-center gap-1">
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-9 w-40"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (renameValue.trim()) {
                        updateSection.mutate({ id: s.id, galleryId: gallery.id, name: renameValue.trim() });
                      }
                      setRenamingId(null);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setRenamingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  key={s.id}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-medium transition-colors ${
                    activeSection === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <button onClick={() => setActiveSection(s.id)} className="px-0.5">{s.name}</button>
                  <button onClick={() => { setRenamingId(s.id); setRenameValue(s.name); }} title="Renomear">
                    <Pencil className="h-3 w-3 opacity-70 hover:opacity-100" />
                  </button>
                  <button
                    title="Excluir seção"
                    onClick={() => {
                      deleteSection.mutate({ id: s.id, galleryId: gallery.id });
                      if (activeSection === s.id) setActiveSection("all");
                    }}
                  >
                    <Trash2 className="h-3 w-3 opacity-70 hover:opacity-100" />
                  </button>
                </div>
              ),
            )}
            {addingSection ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateSection()}
                  placeholder="Nome da seção"
                  className="h-9 w-44"
                />
                <Button size="sm" onClick={handleCreateSection} disabled={createSection.isPending}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingSection(false)}>Cancelar</Button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSection(true)}
                className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Nova seção
              </button>
            )}
          </div>

          <Card className="flex flex-col items-center justify-center gap-3 border-dashed py-14 text-center">
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Arraste suas fotos aqui</p>
            <p className="text-xs text-muted-foreground">JPG, JPEG ou PNG</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled title="Disponível após configurar o armazenamento">Selecionar arquivos</Button>
              <Button variant="outline" disabled title="Disponível após configurar o armazenamento">Selecionar pasta</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O envio será habilitado assim que o armazenamento de fotos estiver conectado.
            </p>
          </Card>

          {visibleMedia.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {visibleMedia.map((m) => (
                <Card key={m.id} className="flex aspect-square items-center justify-center bg-muted/40">
                  <span className="px-2 text-center text-[11px] text-muted-foreground line-clamp-2">{m.filename}</span>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <Images className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma foto nesta entrega ainda.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config">
          <Card className="max-w-2xl space-y-4 p-5">
            <div className="space-y-2">
              <Label>Nome da galeria</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted border-border" />
            </div>

            <ClienteSearchSelect clientes={clientes as any} value={clienteId} onChange={setClienteId} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data do trabalho</Label>
                <DatePickerField value={eventDate} onChange={setEventDate} placeholder="Data do trabalho" />
              </div>
              <div className="space-y-2">
                <Label>Expiração (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={expiraDias}
                  onChange={(e) => setExpiraDias(e.target.value)}
                  className="bg-muted border-border"
                />
                <p className="text-[11px] text-muted-foreground">0 = nunca expira</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Senha de acesso (opcional)</Label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={gallery.password_hash ? "Senha definida - digite para alterar" : "Mínimo 4 caracteres"}
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-2">
              <SearchSelect
                label="Foto de capa"
                options={media.map((m) => ({ value: m.id, label: m.filename }))}
                value={coverId}
                onChange={setCoverId}
                placeholder={media.length ? "Selecione a capa" : "Envie fotos para escolher a capa"}
                emptyLabel="Sem capa"
                searchPlaceholder="Buscar foto..."
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Permitir download</p>
                <p className="text-xs text-muted-foreground">O cliente poderá baixar as fotos da galeria.</p>
              </div>
              <Switch checked={download} onCheckedChange={setDownload} />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={updateGallery.isPending}>Salvar configurações</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="bg-muted border-border" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success("Link copiado!");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar
              </Button>
            </div>
            {entrega && entrega.etapa !== "Entregue" && (
              <Button className="w-full" onClick={marcarEntregue} disabled={updateEntrega.isPending}>
                Marcar entrega como entregue
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir galeria?</AlertDialogTitle>
            <AlertDialogDescription>
              A galeria "{gallery.name}" será removida da sua lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGallery.mutate(gallery.id, { onSuccess: () => navigate("/entregas") })}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GaleriaDetailPage;
