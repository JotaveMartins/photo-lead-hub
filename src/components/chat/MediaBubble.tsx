import { FileText, Download, ImageIcon, Film, Mic, Paperclip } from "lucide-react";

interface Message {
  body?: string | null;
  type?: string | null;
  media_url?: string | null;
  media_filename?: string | null;
  media_mime_type?: string | null;
}

export const MediaBubble = ({ m }: { m: Message }) => {
  const type = m.type || "text";
  const url = m.media_url;
  const caption = m.body;

  if (type === "image" && url) {
    return (
      <div className="space-y-1">
        <img
          src={url}
          alt={caption || "Imagem"}
          className="max-w-full max-h-52 rounded-lg object-cover cursor-pointer block"
          onClick={() => window.open(url, "_blank")}
        />
        {caption && <p className="text-xs leading-relaxed whitespace-pre-wrap">{caption}</p>}
      </div>
    );
  }

  if (type === "video" && url) {
    return (
      <div className="space-y-1">
        <video src={url} controls className="max-w-full max-h-52 rounded-lg block" />
        {caption && <p className="text-xs leading-relaxed whitespace-pre-wrap">{caption}</p>}
      </div>
    );
  }

  if (type === "audio" && url) {
    return <audio src={url} controls className="w-full max-w-[220px] h-9" />;
  }

  if ((type === "document" || type === "file") && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-xs underline underline-offset-2 opacity-90 hover:opacity-100"
      >
        <FileText className="w-4 h-4 flex-shrink-0" />
        <span className="truncate max-w-[180px]">{m.media_filename || caption || "Arquivo"}</span>
        <Download className="w-3 h-3 flex-shrink-0" />
      </a>
    );
  }

  // Media type detected but no URL yet (inbound not downloaded)
  if (type !== "text") {
    const icons: Record<string, React.ReactNode> = {
      image: <ImageIcon className="w-4 h-4" />,
      video: <Film className="w-4 h-4" />,
      audio: <Mic className="w-4 h-4" />,
      document: <FileText className="w-4 h-4" />,
    };
    const labels: Record<string, string> = {
      image: "Imagem",
      video: "Vídeo",
      audio: "Áudio",
      document: "Documento",
    };
    return (
      <div className="flex items-center gap-2 opacity-70 italic text-xs">
        {icons[type] ?? <Paperclip className="w-4 h-4" />}
        <span>{labels[type] ?? "Mídia"}</span>
      </div>
    );
  }

  return <p className="leading-relaxed whitespace-pre-wrap text-sm">{caption || ""}</p>;
};
