/**
 * Size rules for inbound WhatsApp media saved in the CRM Inbox.
 * Heavy files are not downloaded: the message is saved with a notice instead,
 * so one big video never holds up the messages behind it.
 */
export const MB = 1024 * 1024;

export const MEDIA_LIMITS = {
  image: 2 * MB,
  video: 5 * MB,
  audio: 5 * MB,
  document: 5 * MB,
} as const;

/** Maximum bytes the CRM downloads for this kind of media. */
export function mediaLimitBytes(type: string, mime?: string | null): number {
  const m = String(mime || "").toLowerCase();
  if (type === "image") return MEDIA_LIMITS.image;
  if (type === "video") return MEDIA_LIMITS.video;
  if (type === "audio") return MEDIA_LIMITS.audio;
  // Photos sent "as document" follow the photo rule; videos follow the video rule.
  if (m.startsWith("image/")) return MEDIA_LIMITS.image;
  if (m.startsWith("video/")) return MEDIA_LIMITS.video;
  return MEDIA_LIMITS.document;
}

/** WhatsApp fileLength arrives as number, numeric string or protobuf Long. */
export function declaredFileLength(raw: unknown): number | null {
  let value: number;
  if (typeof raw === "number") value = raw;
  else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) value = Number(raw.trim());
  else if (raw && typeof raw === "object" && "low" in raw && "high" in raw) {
    const { low, high } = raw as { low: unknown; high: unknown };
    if (!Number.isInteger(low) || !Number.isInteger(high)) return null;
    value = (Number(high) >>> 0) * 4294967296 + (Number(low) >>> 0);
  } else return null;
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** True only when the size is known and above the limit. */
export function isOverMediaLimit(type: string, mime: string | null | undefined, sizeBytes: number | null): boolean {
  if (sizeBytes == null) return false;
  return sizeBytes > mediaLimitBytes(type, mime);
}

const LABELS: Record<string, { icon: string; name: string; verb: string }> = {
  image: { icon: "📷", name: "Foto", verb: "veja" },
  video: { icon: "🎬", name: "Vídeo", verb: "veja" },
  audio: { icon: "🎤", name: "Áudio", verb: "ouça" },
  document: { icon: "📄", name: "Arquivo", verb: "veja" },
};

/** Text saved in the Inbox in place of a file that was too heavy. */
export function overLimitBody(type: string, mime: string | null | undefined, caption?: string | null): string {
  const m = String(mime || "").toLowerCase();
  const kind = type === "document" && m.startsWith("image/") ? "image"
    : type === "document" && m.startsWith("video/") ? "video"
    : (LABELS[type] ? type : "document");
  const label = LABELS[kind];
  const limitMb = Math.round(mediaLimitBytes(type, mime) / MB);
  const notice = `${label.icon} ${label.name} acima de ${limitMb} MB — ${label.verb} no WhatsApp`;
  const extra = String(caption || "").trim();
  return extra ? `${notice}\n${extra}` : notice;
}
