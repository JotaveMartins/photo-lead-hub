import { useRef, useState } from "react";
import { UploadCloud, Check, AlertCircle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StorageService, putToR2 } from "@/lib/storage/StorageService";
import { toast } from "sonner";

type ItemStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: ItemStatus;
  progress: number;
  error?: string;
}

const ACCEPT = ["image/jpeg", "image/jpg", "image/png"];
const MAX = 50 * 1024 * 1024;
const CONCURRENCY = 4;

interface Props {
  galleryId: string;
  sectionId?: string | null;
  onUploaded: () => void;
}

const GalleryUploader = ({ galleryId, sectionId, onUploaded }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);

  const update = (id: string, patch: Partial<QueueItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const uploadOne = async (item: QueueItem) => {
    update(item.id, { status: "uploading", progress: 0, error: undefined });
    try {
      const res = await StorageService.createUploadUrl({
        galleryId,
        filename: item.file.name,
        contentType: item.file.type,
        fileSize: item.file.size,
        sectionId: sectionId ?? null,
      });
      await putToR2(res.uploadUrl, item.file, (p) => update(item.id, { progress: p }));
      await StorageService.confirmUpload(res.mediaId);
      update(item.id, { status: "done", progress: 100 });
    } catch (e: any) {
      update(item.id, { status: "error", error: e?.message ?? "Erro no envio" });
    }
  };

  const runQueue = async (queue: QueueItem[]) => {
    setRunning(true);
    let idx = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (idx < queue.length) {
        const item = queue[idx++];
        await uploadOne(item);
      }
    });
    await Promise.all(workers);
    setRunning(false);
    onUploaded();
  };

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const rejected: string[] = [];
    const accepted = Array.from(list).filter((f) => {
      if (!ACCEPT.includes(f.type.toLowerCase())) { rejected.push(f.name); return false; }
      if (f.size > MAX) { rejected.push(f.name); return false; }
      return true;
    });
    if (rejected.length) toast.error(`${rejected.length} arquivo(s) ignorado(s): apenas JPG/PNG até 50 MB.`);
    if (!accepted.length) return;
    const newItems: QueueItem[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      status: "queued",
      progress: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
    runQueue(newItems);
  };

  const total = items.length;
  const done = items.filter((i) => i.status === "done").length;
  const errors = items.filter((i) => i.status === "error").length;
  const overall = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <Card
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-3 border-dashed py-12 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : ""
        }`}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Arraste suas fotos aqui</p>
        <p className="text-xs text-muted-foreground">JPG, JPEG ou PNG · até 50 MB por foto</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Selecionar arquivos</Button>
          <Button variant="outline" onClick={() => folderRef.current?.click()}>Selecionar pasta</Button>
        </div>
        <input
          ref={fileRef} type="file" multiple accept="image/jpeg,image/png" className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
        <input
          ref={folderRef} type="file" multiple className="hidden"
          // @ts-expect-error atributo de diretório
          webkitdirectory="" directory=""
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </Card>

      {total > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {running ? `Enviando ${done} de ${total} fotos` : `${done} de ${total} fotos enviadas`}
              {errors > 0 && <span className="ml-2 text-destructive">{errors} com erro</span>}
            </span>
            <span className="text-muted-foreground">{overall}%</span>
          </div>
          <Progress value={overall} />
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-xs">
                {i.status === "done" && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                {i.status === "uploading" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
                {i.status === "queued" && <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />}
                {i.status === "error" && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                <span className="flex-1 truncate text-foreground">{i.file.name}</span>
                <span className="text-muted-foreground">
                  {i.status === "queued" && "Aguardando"}
                  {i.status === "uploading" && `${i.progress}%`}
                  {i.status === "done" && "Concluído"}
                  {i.status === "error" && (i.error ?? "Erro")}
                </span>
                {i.status === "error" && (
                  <button
                    className="text-primary hover:underline"
                    onClick={async () => { await uploadOne(i); onUploaded(); }}
                    title="Tentar novamente"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!running && (
            <Button variant="ghost" size="sm" onClick={() => setItems([])}>Limpar lista</Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default GalleryUploader;
