/** Display original WhatsApp chronology; created_at remains the receipt time. */
export const sortInboxMessages = <T extends { id: string; timestamp?: string | null; created_at: string }>(messages: T[]): T[] =>
  [...messages].sort((a, b) => {
    const sent = (m: T) => Date.parse(m.timestamp || m.created_at);
    return sent(a) - sent(b) || Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id);
  });
