export interface InboxMessageMatch {
  body: string;
  sentAt: string;
}

interface SearchMessage {
  conversation_id: string | null;
  body: string | null;
  timestamp: string | null;
  created_at: string;
}

export const buildInboxMessageMatches = (messages: SearchMessage[]) => {
  const matches = new Map<string, InboxMessageMatch>();
  for (const message of messages) {
    if (!message.conversation_id || !message.body) continue;
    // Synced history may be inserted much later than the message was sent.
    const sentAt = message.timestamp ?? message.created_at;
    const previous = matches.get(message.conversation_id);
    if (!previous || new Date(sentAt).getTime() > new Date(previous.sentAt).getTime()) {
      matches.set(message.conversation_id, { body: message.body, sentAt });
    }
  }
  return matches;
};
