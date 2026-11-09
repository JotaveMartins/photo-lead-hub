import { useReviewLocale } from "@/i18n/ReviewLocale";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGoogleCalendarConnection,
  useConnectGoogleCalendar,
  useDisconnectGoogleCalendar,
} from "@/hooks/useGoogleCalendar";

const GoogleCalendarCard = () => {
  const { t } = useReviewLocale();
  const { data: connection, isLoading } = useGoogleCalendarConnection();
  const connect = useConnectGoogleCalendar();
  const disconnect = useDisconnectGoogleCalendar();

  const isConnected = !!connection;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{t("Google Agenda")}</p>
            <p className="text-xs text-muted-foreground">{t("Eventos criados no CRM aparecem no seu Google Agenda")}</p>
          </div>
        </div>
        {isConnected ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t("Conectado")}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5" /> {t("Não conectado")}</span>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t("Carregando...")}</p>
      ) : isConnected ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs">
            <p className="text-muted-foreground">{t("Conta conectada")}</p>
            <p className="font-mono text-foreground mt-0.5">{connection!.google_email}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
          >
            {disconnect.isPending ? t("Desconectando...") : t("Desconectar")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("O que acontece ao conectar:")}</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>{t("Novos eventos do CRM são criados automaticamente no seu Google Agenda")}</li>
              <li>{t("Edições e exclusões também são sincronizadas")}</li>
              <li>{t("Mudanças feitas direto no Google não voltam pro CRM")}</li>
              <li>{t("Eventos antigos do CRM não são enviados")}</li>
            </ul>
          </div>
          <Button
            type="button"
            onClick={() => connect.mutate()}
            disabled={connect.isPending}
            className="bg-gradient-primary hover:opacity-90"
          >
            {connect.isPending ? t("Abrindo Google...") : t("Conectar Google Agenda")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarCard;