import { useState } from "react";
import { FileText, Download, ImageIcon, Film, Mic, Paperclip, X } from "lucide-react";

interface Message {
  body?: string | null;
  type?: string | null;
  media_url?: string | null;
  media_filename?: string | null;
  media_mime_type?: string | null;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/ogg": "ogv", "video/webm": "webm", "video/quicktime": "mov",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/webm": "weba", "audio/wav": "wav",
  "application/pdf": "pdf",
};

function inferFilename(m: Message): string {
  if (m.media_filename) return m.media_filename;
  const ext = (m.media_mime_type && MIME_TO_EXT[m.media_mime_type]) || "bin";
  const stamp = Date.now();
  const base =
    m.type === "image" ? "imagem" :
    m.type === "video" ? "video" :
    m.type === "audio" ? "audio" :
    "arquivo";
  return `${base}-${stamp}.${ext}`;
}

async function downloadFile(url: string, filename: string) {
  try {
    const resp = await fetch(url, { mode: "cors" });
    if (!resp.ok) throw new Error("download failed");
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    // Fallback: open in new tab
    window.open(url, "_blank");
  }
}

const DownloadButton = ({ url, filename, light }: { url: string; filename: string; light?: boolean }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); downloadFile(url, filename); }}
    className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
      light
        ? "bg-black/50 text-white hover:bg-black/70"
        : "bg-muted/60 text-foreground hover:bg-muted"
    }`}
    title="Baixar"
  >
    <Download className="w-3.5 h-3.5" />
  </button>
);

export const MediaBubble = ({ m }: { m: Message }) => {
  const [imageOpen, setImageOpen] = useState(false);
  const type = m.type || "text";
  const url = m.media_url;
  const caption = m.body;
  const filename = inferFilename(m);

  if (type === "image" && url) {
    return (
      <>
        <div className="space-y-1">
          <div className="relative group/media inline-block">
            <img
              src={url}
              alt={caption || "Imagem"}
              className="max-w-full max-h-60 rounded-lg object-cover cursor-zoom-in block"
              onClick={() => setImageOpen(true)}
              loading="lazy"
            />
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/media:opacity-100 transition-opacity">
              <DownloadButton url={url} filename={filename} light />
            </div>
          </div>
          {caption && <p className="text-xs leading-relaxed whitespace-pre-wrap">{caption}</p>}
        </div>

        {imageOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setImageOpen(false)}
          >
            <button
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setImageOpen(false); }}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              className="absolute top-4 right-16 inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/10 text-white text-xs hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); downloadFile(url, filename); }}
            >
              <Download className="w-4 h-4" /> Baixar
            </button>
            <img src={url} alt={caption || "Imagem"} className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        )}
      </>
    );
  }

  if (type === "video" && url) {
    return (
      <div className="space-y-1">
        <div className="relative group/media inline-block">
          <video
            src={url}
            controls
            preload="metadata"
            className="max-w-full max-h-60 rounded-lg block bg-black"
          />
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/media:opacity-100 transition-opacity">
            <DownloadButton url={url} filename={filename} light />
          </div>
        </div>
        {caption && <p className="text-xs leading-relaxed whitespace-pre-wrap">{caption}</p>}
      </div>
    );
  }

  if (type === "audio" && url) {
    return (
      <div className="flex items-center gap-2">
        <audio
          src={url}
          controls
          preload="metadata"
          className="h-9 max-w-[220px]"
        />
        <DownloadButton url={url} filename={filename} />
      </div>
    );
  }

  if ((type === "document" || type === "file") && url) {
    return (
      <div className="flex items-center gap-2 bg-background/30 rounded-md px-2 py-1.5 min-w-[180px]">
        <FileText className="w-5 h-5 flex-shrink-0 opacity-80" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{filename}</p>
          {m.media_mime_type && (
            <p className="text-[10px] opacity-60 truncate">{m.media_mime_type}</p>
          )}
        </div>
        <DownloadButton url={url} filename={filename} />
      </div>
    );
  }

  // Media type detected but no URL (download from WhatsApp may have failed/expired)
  if (type !== "text") {
    const icons: Record<string, React.ReactNode> = {
      image: <ImageIcon className="w-4 h-4" />,
      video: <Film className="w-4 h-4" />,
      audio: <Mic className="w-4 h-4" />,
      document: <FileText className="w-4 h-4" />,
    };
    const labels: Record<string, string> = {
      image: "Imagem indisponível",
      video: "Vídeo indisponível",
      audio: "Áudio indisponível",
      document: "Documento indisponível",
    };
    return (
      <div className="flex items-center gap-2 opacity-70 italic text-xs">
        {icons[type] ?? <Paperclip className="w-4 h-4" />}
        <span>{labels[type] ?? "Mídia indisponível"}</span>
      </div>
    );
  }

  return <p className="leading-relaxed whitespace-pre-wrap text-sm">{caption || ""}</p>;
};
