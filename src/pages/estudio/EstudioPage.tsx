import { useNavigate } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useStudio";
import ProjectCard from "@/components/studio/ProjectCard";

const EstudioPage = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();

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
        <Button onClick={() => navigate("/estudio/novo")}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo projeto
        </Button>
      </header>

      {isLoading ? (
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EstudioPage;