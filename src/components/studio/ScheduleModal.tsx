import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Instagram, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DatePickerField from "@/components/DatePickerField";
import TimePickerField from "@/components/TimePickerField";
import { InstagramAccount } from "@/hooks/useSocial";

export type ScheduleMode = "schedule" | "now";

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  account?: InstagramAccount | null;
  slideCount: number;
  caption: string;
  busyLabel?: string | null;
  initialDate?: string;
  initialTime?: string;
  onConfirm: (mode: ScheduleMode, scheduledAtISO: string | null) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

const ScheduleModal = ({
  open,
  onClose,
  account,
  slideCount,
  caption,
  busyLabel,
  initialDate,
  initialTime,
  onConfirm,
}: ScheduleModalProps) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    if (!open) return;
    const base = new Date(Date.now() + 60 * 60 * 1000);
    setDate(
      initialDate ??
        `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    );
    setTime(initialTime ?? `${pad(base.getHours())}:00`);
  }, [open, initialDate, initialTime]);

  const scheduledAt = date && time ? new Date(`${date}T${time}:00`) : null;
  const inPast = !!scheduledAt && scheduledAt.getTime() < Date.now();
  const connected = !!account && account.status === "connected";
  const busy = !!busyLabel;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Publicar no Instagram
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-pink-500/10">
              {account?.profile_picture_url ? (
                <img src={account.profile_picture_url} alt="" className="h-9 w-9 object-cover" />
              ) : (
                <Instagram className="h-4 w-4 text-pink-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {connected ? `@${account?.username ?? account?.instagram_user_id}` : "Nenhuma conta conectada"}
              </p>
              <p className="text-xs text-muted-foreground">
                {slideCount} imagem(ns) · legenda com {caption.length} caracteres
              </p>
            </div>
          </div>

          {!connected && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
              Conecte sua conta profissional do Instagram em Configurações → Integrações antes de publicar.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <DatePickerField value={date} onChange={setDate} disabled={busy} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Horário</label>
              <TimePickerField value={time} onChange={setTime} disabled={busy} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Fuso horário: America/São_Paulo
            {inPast && <span className="ml-1 text-destructive">· escolha um horário futuro</span>}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            disabled={busy || !connected}
            onClick={() => onConfirm("now", null)}
          >
            {busyLabel === "publicando" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}
            Publicar agora
          </Button>
          <Button
            disabled={busy || !connected || !scheduledAt || inPast}
            onClick={() => {
              if (!scheduledAt) return toast.error("Escolha data e horário");
              onConfirm("schedule", scheduledAt.toISOString());
            }}
          >
            {busyLabel === "agendando" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CalendarClock className="mr-1.5 h-4 w-4" />
            )}
            Agendar publicação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleModal;