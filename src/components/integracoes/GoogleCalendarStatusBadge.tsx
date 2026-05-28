import { Calendar, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useGoogleCalendarConnection,
  useConnectGoogleCalendar,
} from "@/hooks/useGoogleCalendar";
import { cn } from "@/lib/utils";

const GoogleCalendarStatusBadge = () => {
  const { data: connection, isLoading } = useGoogleCalendarConnection();
  const connect = useConnectGoogleCalendar();
  const isConnected = !!connection;

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1.5 rounded-md border border-border bg-card">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </span>
    );
  }

  if (isConnected) {
    return (
      <Link
        to="/configuracoes/integracoes"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
        title={`Sincronizando com ${connection!.google_email}`}
      >
        <Calendar className="w-3.5 h-3.5" />
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Google Agenda sincronizado</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connect.mutate()}
      disabled={connect.isPending}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted transition-colors",
        connect.isPending && "opacity-60 cursor-wait",
      )}
      title="Clique para conectar seu Google Agenda"
    >
      <Calendar className="w-3.5 h-3.5" />
      <AlertCircle className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">
        {connect.isPending ? "Abrindo Google..." : "Conectar Google Agenda"}
      </span>
    </button>
  );
};

export default GoogleCalendarStatusBadge;