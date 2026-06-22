// Visual-only deduplication for chat message lists.
// Does NOT delete or modify rows in the database — only collapses what is
// rendered. Useful when realtime + optimistic updates briefly produce two
// rows for the same message, or when the same message arrives via webhook
// and via send-whatsapp insert.
export function dedupeMessages<T extends {
  id: string;
  body?: string | null;
  direction?: string | null;
  type?: string | null;
  whatsapp_message_id?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  media_url?: string | null;
}>(messages: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const m of messages) {
    const keys: string[] = [];
    if (m.whatsapp_message_id) keys.push(`wid:${m.whatsapp_message_id}`);
    const ts = m.timestamp || m.created_at || "";
    // Truncate to minute precision to catch echoes that have slightly different timestamps.
    const minuteBucket = ts ? ts.slice(0, 16) : "";
    const bodyKey = (m.body || "").trim();
    const mediaKey = m.media_url || "";
    keys.push(
      `sig:${m.direction || ""}|${m.type || "text"}|${bodyKey}|${mediaKey}|${minuteBucket}`,
    );
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    out.push(m);
  }
  return out;
}