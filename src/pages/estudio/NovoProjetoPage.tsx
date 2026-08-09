import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SearchSelect from "@/components/SearchSelect";
import UploadArea from "@/components/studio/UploadArea";
import { TIPOS_ENSAIO, useCreateProject, useUploadPhotos } from "@/hooks/useStudio";

const NovoProjetoPage = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Casamento");
  const [descricao, setDescricao] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const createProject = useCreateProject();
  const [projectId, setProjectId] = useState<string | undefined>();
  const uploadPhotos = useUploadPhotos(projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome do projeto");
    setSubmitting(true);
    try {
      const project = await createProject.mutateAsync({
        nome: nome.trim(),
        tipo_ensaio: tipo,
        descricao: descricao.trim(),
      });
      setProjectId(project.id);
      if (files.length) {
        await uploadPhotos.mutateAsync({
          files,
          startOrder: 0,
          onProgress: (done, total) => setProgress({ done, total }),
        } as any);
      }
      toast.success("Projeto criado!");
      navigate(`/estudio/${project.id}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar projeto");
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/estudio")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="font-display text-3xl font-semibold text-foreground">Novo projeto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Descreva o ensaio e envie as fotografias.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nome do projeto
          </label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Amanda & Rafael — Pré-Wedding"
            className="bg-muted/40"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tipo de ensaio
          </label>
          <SearchSelect
            value={tipo}
            onChange={(v) => setTipo(v)}
            options={TIPOS_ENSAIO.map((t) => ({ value: t, label: t }))}
            placeholder="Selecione o tipo"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contexto do ensaio
          </label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            placeholder="Ensaio pré-wedding de Amanda e Rafael realizado na praia durante o pôr do sol."
            className="bg-muted/40"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fotografias
          </label>
          <UploadArea
            compact
            uploading={submitting && !!files.length}
            progress={progress}
            onFiles={(f) => setFiles((prev) => [...prev, ...f])}
          />
          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {files.length} imagem(ns) selecionada(s)
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/estudio")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Criando..." : "Criar projeto"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NovoProjetoPage;