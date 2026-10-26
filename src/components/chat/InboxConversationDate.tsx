import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InboxMessageMatch } from "@/lib/inboxMessageSearch";

const InboxConversationDate = ({ updatedAt, match }: { updatedAt: string; match?: InboxMessageMatch }) => {
  const date = new Date(match?.sentAt ?? updatedAt);
  const fullDate = format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  const label = match
    ? fullDate
    : isToday(date)
      ? format(date, "HH:mm")
      : isYesterday(date) ? "Ontem" : format(date, "dd/MM", { locale: ptBR });

  return (
    <time
      dateTime={match?.sentAt ?? updatedAt}
      title={match ? `Mensagem encontrada em ${fullDate}` : `Última atividade em ${fullDate}`}
      className="text-[10px] text-muted-foreground whitespace-nowrap ml-1"
    >
      {label}
    </time>
  );
};

export default InboxConversationDate;
