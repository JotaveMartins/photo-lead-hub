import { whatsappSentAt } from "../_shared/whatsapp-time.ts";

export type Metadata = { message_id: string | null; sent_at: string | null; from_me: boolean; is_group: boolean };
export const metadata = (m: any): Metadata => ({
  message_id: typeof m?.key?.id === "string" ? m.key.id : null,
  sent_at: whatsappSentAt(m?.messageTimestamp),
  from_me: m?.key?.fromMe === true,
  is_group: String(m?.key?.remoteJid ?? "").endsWith("@g.us"),
});
export const unwrapRecords = (data: any): any[] => {
  for (const rows of [data, data?.messages?.records, data?.records, data?.messages])
    if (Array.isArray(rows)) return rows;
  throw new Error("PROVIDER_UNEXPECTED_RESPONSE");
};

/** Only these two provider routes are used. POST findMessages is a read query. */
export async function inspectProvider(
  baseUrl: string, apiKey: string, instanceName: string,
  options: { from: string; to: string; jids: string[]; maxPages: number },
  request: typeof fetch = fetch,
) {
  const read = async (path: string, body?: unknown) => {
    const response = await request(`${baseUrl}${path}/${encodeURIComponent(instanceName)}`, {
      method: body ? "POST" : "GET", signal: AbortSignal.timeout(10_000),
      headers: { apikey: apiKey, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
    try { return await response.json(); } catch { throw new Error("PROVIDER_INVALID_JSON"); }
  };
  const state = await read("/instance/connectionState");
  const messages: Metadata[] = [];
  const seen = new Set<string>();
  let limited = false;
  let checkedTimes = 0;
  let windowRespected = true;
  for (const jid of options.jids.length ? options.jids : [null]) {
    for (let page = 0; page < options.maxPages; page++) {
      // Evolution 2.3.7 fetchMessages expects date strings with gte AND lte,
      // and uses page/offset. Prisma-style take/skip and gte/lt are ignored.
      const result = await read("/chat/findMessages", {
        where: {
          ...(jid ? { key: { remoteJid: jid } } : {}),
          messageTimestamp: {
            gte: new Date(options.from).toISOString(),
            lte: new Date(Date.parse(options.to) - 1).toISOString(),
          },
        }, page: page + 1, offset: 50,
      });
      const records = unwrapRecords(result);
      let added = 0;
      for (const raw of records) {
        const m = metadata(raw);
        checkedTimes++;
        if (!m.sent_at || Date.parse(m.sent_at) < Math.floor(Date.parse(options.from) / 1000) * 1000 || Date.parse(m.sent_at) >= Date.parse(options.to))
          windowRespected = false;
        if (m.message_id && !seen.has(m.message_id)) { seen.add(m.message_id); messages.push(m); added++; }
      }
      const total = result?.messages?.total;
      const more = Number.isSafeInteger(total) && total >= 0 ? (page + 1) * 50 < total : records.length >= 50;
      if (!more) break;
      if (!added || page === options.maxPages - 1) { limited = true; break; }
    }
  }
  const providerState = state?.instance?.state ?? state?.state;
  return { state: typeof providerState === "string" ? providerState : "unknown", messages, sample_limited: limited, window_respected: checkedTimes ? windowRespected : null };
}
