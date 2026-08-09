import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Images } from "lucide-react";
import { StudioProject } from "@/hooks/useStudio";

const STATUS_STYLES: Record<string, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  Gerado: "bg-primary/15 text-primary",
  "Em edição": "bg-amber-500/15 text-amber-500",
  Aprovado: "bg-emerald-500/15 text-emerald-500",
};

interface ProjectCardProps {
  project: StudioProject;
  onClick: (project: StudioProject) => void;
}

const ProjectCard = ({ project, onClick }: ProjectCardProps) => (
  <button
    onClick={() => onClick(project)}
    className="group flex w-full flex-col gap-4 rounded-xl border border-border/60 bg-card/60 p-5 text-left transition-all hover:border-primary/40 hover:bg-card"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="truncate font-display text-lg font-semibold text-foreground">
          {project.nome}
        </h3>
        <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
          {project.tipo_ensaio}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
          STATUS_STYLES[project.status] ?? STATUS_STYLES.Rascunho
        }`}
      >
        {project.status}
      </span>
    </div>

    {project.descricao && (
      <p className="line-clamp-2 text-sm text-muted-foreground">{project.descricao}</p>
    )}

    <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Images className="h-3.5 w-3.5" />
        {project.photo_count ?? 0} fotos
      </span>
      <span>
        {format(new Date(project.created_at), "dd MMM yyyy", { locale: ptBR })}
      </span>
    </div>
  </button>
);

export default ProjectCard;