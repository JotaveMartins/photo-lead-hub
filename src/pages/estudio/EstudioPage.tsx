import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  StudioProject,
  useDeletedProjects,
  useDeleteProject,
  useProjects,
  usePurgeProject,
  useRestoreProject,
} from "@/hooks/useStudio";
import ProjectCard from "@/components/studio/ProjectCard";
import CalendarioPage from "./CalendarioPage";

const EstudioPage = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: trash = [] } = useDeletedProjects();
  const deleteProject = useDeleteProject();
  const restoreProject = useRestoreProject();
  const purgeProject = usePurgeProject();

  const [tab, setTab] = useState<"projetos" | "calendario" | "lixeira">("projetos");
  const [toDelete, setToDelete] = useState<StudioProject | null>(null);
  const [toPurge, setToPurge] = useState<StudioProject | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Estúdio de conteúdo
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">
            Meus Projetos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transforme suas galerias em carrosséis prontos para o Instagram.
          </p>
        </div>
        {tab !== "calendario" && (
          <Button onClick={() => navigate("/estudio/novo")}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo projeto
          </Button>
        )}
      </header>

      <div className="inline-flex rounded-full border border-border/60 bg-muted/30 p-1">
        {(["projetos", "calendario", "lixeira"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "projetos"
              ? "Projetos"
              : t === "calendario"
                ? "Calendário"
                : `Lixeira${trash.length ? ` (${trash.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "calendario" ? (
        <CalendarioPage />
      ) : tab === "lixeira" ? (
        trash.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            A lixeira está vazia.
          </p>
        ) : (
          <div className="divide-y divide-border/50 rounded-xl border border-border/60">
            {trash.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{p.nome}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Excluído em{" "}
                    {p.deleted_at
                      ? format(new Date(p.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : "-"}{" "}
                    · {p.photo_count ?? 0} fotos · status anterior: {p.status}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restoreProject.isPending}
                  onClick={() =>
                    restoreProject.mutate(p.id, {
                      onSuccess: () => toast.success("Projeto restaurado"),
                      onError: (e: any) => toast.error(e?.message ?? "Erro ao restaurar"),
                    })
                  }
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Restaurar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setToPurge(p)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Excluir permanentemente
                </Button>
              </div>
            ))}
          </div>
        )
      ) : isLoading ? (
        <p className="py-20 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-24 text-center">
          <h2 className="font-display text-xl text-foreground">
            Nenhum projeto ainda
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Crie seu primeiro projeto, envie as fotografias do ensaio e gere um
            carrossel em poucos cliques.
          </p>
          <Button className="mt-6" onClick={() => navigate("/estudio/novo")}>
            <Plus className="mr-1.5 h-4 w-4" /> Criar projeto
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={(proj) => navigate(`/estudio/${proj.id}`)}
              onDelete={setToDelete}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza de que deseja excluir este projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              O projeto "{toDelete?.nome}" será enviado para a Lixeira e poderá ser recuperado
              posteriormente. Nenhuma fotografia será apagada agora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = toDelete;
                setToDelete(null);
                if (target)
                  deleteProject.mutate(target.id, {
                    onSuccess: () => toast.success("Projeto movido para a Lixeira"),
                    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
                  });
              }}
            >
              Excluir projeto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toPurge} onOpenChange={(o) => !o && setToPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não poderá ser desfeita. Serão removidos o projeto
              "{toPurge?.nome}", seus carrosséis, slides e todas as fotografias enviadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const target = toPurge;
                setToPurge(null);
                if (target)
                  purgeProject.mutate(target.id, {
                    onSuccess: () => toast.success("Projeto excluído permanentemente"),
                    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
                  });
              }}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EstudioPage;