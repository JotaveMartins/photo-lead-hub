import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Loader2,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  PostStatus,
  ScheduledPost,
  useCancelPost,
  useInstagramAccount,
  usePublishPost,
  useReschedulePost,
  useScheduledPosts,
} from "@/hooks/useSocial";

const statusStyles: Record<PostStatus, string> = {
  agendado: "bg-sky-500/15 text-sky-400",
  publicando: "bg-amber-500/15 text-amber-500",
  publicado: "bg-emerald-500/15 text-emerald-400",
  falhou: "bg-destructive/15 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
};

const statusLabel: Record<PostStatus, string> = {
  agendado: "Agendado",
  publicando: "Publicando",
  publicado: "Publicado",
  falhou: "Falhou",
  cancelado: "Cancelado",
};

const CalendarioPage = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<ScheduledPost | null>(null);

  const { data: posts = [], isLoading } = useScheduledPosts();
  const { data: account } = useInstagramAccount();
  const publish = usePublishPost();
  const cancel = useCancelPost();
  const reschedule = useReschedulePost();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) out.push(new Date(d));
    return out;
  }, [month]);

  const postsByDay = (day: Date) =>
    posts.filter((p) => isSameDay(new Date(p.scheduled_at), day));

  const upcoming = posts.filter((p) => ["agendado", "publicando", "falhou"].includes(p.status));

  const handlePublishNow = (post: ScheduledPost) =>
    publish.mutate(post.id, {
      onSuccess: () => toast.success("Publicado no Instagram!"),
      onError: (e: any) => toast.error(e?.message ?? "Falha ao publicar"),
    });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Estúdio IA</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
            Calendário de conteúdo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe os carrosséis agendados e publicados
            {account?.username && ` em @${account.username}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[150px] text-center text-sm font-medium capitalize text-foreground">
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="bg-card px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayPosts = postsByDay(day);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[104px] bg-card p-1.5 ${
                isSameMonth(day, month) ? "" : "opacity-40"
              }`}
            >
              <div
                className={`mb-1 text-xs ${
                  isSameDay(day, new Date())
                    ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayPosts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-medium ${statusStyles[p.status]}`}
                  >
                    {format(new Date(p.scheduled_at), "HH:mm")} · {p.projectName}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Próximas publicações</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
            <CalendarDays className="mx-auto mb-2 h-5 w-5" />
            Nenhuma publicação agendada. Aprove um carrossel no Estúdio IA para agendar.
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {upcoming.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 bg-card p-3">
                <Instagram className="h-4 w-4 shrink-0 text-pink-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.projectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} ·{" "}
                    {p.slideCount} imagem(ns)
                    {p.last_error && <span className="text-destructive"> · {p.last_error}</span>}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusStyles[p.status]}`}>
                  {statusLabel[p.status]}
                </span>
                <div className="flex gap-1.5">
                  {p.projectId && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/estudio/${p.projectId}`)}>
                      Ver projeto
                    </Button>
                  )}
                  {p.status === "falhou" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        reschedule.mutate(
                          { id: p.id, scheduledAt: new Date(Date.now() + 120000).toISOString() },
                          { onSuccess: () => toast.success("Reagendado para daqui a 2 minutos") },
                        )
                      }
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Tentar de novo
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={publish.isPending}
                    onClick={() => handlePublishNow(p)}
                  >
                    {publish.isPending && publish.variables === p.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Publicar agora
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      cancel.mutate(p.id, { onSuccess: () => toast.success("Agendamento cancelado") })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {selected.projectName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {format(new Date(selected.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} ·{" "}
                {statusLabel[selected.status]}
              </p>
            </div>
            {selected.caption && (
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                {selected.caption}
              </p>
            )}
            <div className="flex justify-end gap-2">
              {selected.projectId && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/estudio/${selected.projectId}`)}>
                  Abrir projeto
                </Button>
              )}
              <Button size="sm" onClick={() => setSelected(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioPage;