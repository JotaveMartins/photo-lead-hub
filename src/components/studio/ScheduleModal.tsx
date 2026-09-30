import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Instagram, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  imageUrls?: string[];
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
  imageUrls = [],
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
  const hashtags = (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).join(" ");
  const captionText = caption.replace(/#[\p{L}\p{N}_]+/gu, "").trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Publicar no Instagram
          </DialogTitle>
          <DialogDescription className="sr-only">
            Revise o conteúdo e escolha quando publicar no Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-5 py-4">
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

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Imagem</p>
            <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
              {imageUrls.map((u, i) => (
                <img key={i} src={u} alt={`Imagem ${i + 1}`} loading="lazy" decoding="async" className="h-16 w-14 shrink-0 rounded-md border border-border object-cover" />
              ))}
              {!imageUrls.length && <p className="text-xs text-muted-foreground">Nenhuma imagem</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Legenda</p>
            <p className="max-h-28 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
              {captionText || "Sem legenda"}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Hashtags</p>
            <p className="rounded-md border border-border bg-muted/40 p-2 text-xs text-primary">
              {hashtags || "Sem hashtags"}
            </p>
          </div>

          {!connected && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
              Conecte sua conta profissional do Instagram em Configurações → Integrações antes de publicar.
            </p>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <DatePickerField value={date} onChange={setDate} disabled={busy} className="min-w-0" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Horário</label>
              <TimePickerField value={time} onChange={setTime} disabled={busy} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Fuso horário: America/São_Paulo
            {inPast && <span className="ml-1 text-destructive">· escolha um horário futuro</span>}
          </p>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background px-5 py-4 sm:justify-between">
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
            Publicar no Instagram
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