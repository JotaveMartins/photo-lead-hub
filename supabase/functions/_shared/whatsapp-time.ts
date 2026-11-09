/** WhatsApp epoch seconds (including protobuf Long) or epoch milliseconds. */
export const whatsappSentAt = (raw: unknown, now = Date.now()): string | null => {
  let value: number;
  if (typeof raw === "number") value = raw;
  else if (typeof raw === "string" && /^\d+(?:\.\d+)?$/.test(raw)) value = Number(raw);
  else if (raw && typeof raw === "object" && "low" in raw && "high" in raw) {
    const { low, high } = raw as { low: unknown; high: unknown };
    if (!Number.isInteger(low) || !Number.isInteger(high)) return null;
    value = (Number(high) >>> 0) * 4294967296 + (Number(low) >>> 0);
  } else return null;
  const ms = value < 100_000_000_000 ? value * 1000 : value;
  if (!Number.isFinite(ms) || ms < Date.UTC(2000, 0, 1) || ms > now + 300_000) return null;
  return new Date(ms).toISOString();
};
