import { useRef, useState, useMemo } from "react";
import {
  useContratos, useUpdateContrato, useUploadContratoFile,
  useDeleteContrato, useDeletedContratos, useRestoreContrato,
  usePermanentDeleteContrato, type Contrato,
} from "@/hooks/useContratos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Upload, Calendar, MapPin, DollarSign, Clock, Trash2,
  CheckCircle2, Send, Hourglass, Eye, Archive, RotateCcw, Trash,
  Search, X, SlidersHorizontal,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import ContratoDrawer from "@/components/contratos/ContratoDrawer";

type ContratoStatus = "aguardando_contrato" | "contrato_enviado" | "contrato_assinado";

const STATUS_COLUMNS: {
  status: ContratoStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  badgeClass: string;
}[] = [
  {
    status: "aguardando_contrato",
    label: "Aguardando Contrato",
    icon: <Hourglass className="w-4 h-4" />,
    color: "bg-yellow-500",
    badgeClass: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  {
    status: "contrato_enviado",
    label: "Contrato Enviado",
    icon: <Send className="w-4 h-4" />,
    color: "bg-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    status: "contrato_assinado",
    label: "Contrato Assinado",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "bg-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
];

const formatCurrency = (value: number | null) => {
  if (!value) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatDate = (d: string | null) => {
  if (!d) return null;
  try {
    return format(parseLocalDate(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

interface ContratoCardProps {
  contrato: Contrato;
  onUpload: (contrato: Contrato, file: File) => void;
  onDelete: (contrato: Contrato) => void;
  onMarkSigned: (contrato: Contrato) => void;
  onView: (contrato: Contrato) => void;
  uploading: boolean;
}

const ContratoCard = ({ contrato, onUpload, onDelete, onMarkSigned, onView, uploading }: ContratoCardProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(contrato, file);
    e.target.value = "";
  };

  const col = STATUS_COLUMNS.find((c) => c.status === contrato.status)!;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground text-sm leading-tight">{contrato.nome_cliente}</p>
          {contrato.cpf_cnpj && (
            <p className="text-[11px] text-muted-foreground">CPF/CNPJ: {contrato.cpf_cnpj}</p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${col.badgeClass}`}>
          {col.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        {contrato.tipo_servico && (
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="text-foreground font-medium">{contrato.tipo_servico}</span>
            {contrato.pacote && <span>· {contrato.pacote}</span>}
          </div>
        )}
        {contrato.data_evento && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{formatDate(contrato.data_evento)}</span>
            {(contrato.horario_inicio || contrato.horario_fim) && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {contrato.horario_inicio}{contrato.horario_fim ? ` – ${contrato.horario_fim}` : ""}
              </span>
            )}
          </div>
        )}
        {contrato.local_evento && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{contrato.local_evento}</span>
          </div>
        )}
        {contrato.valor && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 flex-shrink-0" />
            <span className="text-foreground font-semibold">{formatCurrency(contrato.valor)}</span>
            {contrato.forma_pagamento && <span>· {contrato.forma_pagamento}</span>}
          </div>
        )}
        {contrato.email && (
          <p className="truncate">{contrato.email}</p>
        )}
        {contrato.whatsapp && (
          <p>{contrato.whatsapp}</p>
        )}
        {contrato.observacoes && (
          <p className="italic text-[11px] line-clamp-2">{contrato.observacoes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        {/* Ver sempre disponível */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => onView(contrato)}
        >
          <Eye className="w-3 h-3" /> Ver
        </Button>

        {contrato.status === "aguardando_contrato" && (
          <>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-gradient-primary hover:opacity-90"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-3 h-3" />
              {uploading ? "Enviando..." : "Anexar Contrato"}
            </Button>
          </>
        )}
        {contrato.status === "contrato_enviado" && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
            onClick={() => onMarkSigned(contrato)}
          >
            <CheckCircle2 className="w-3 h-3" /> Marcar como Assinado
          </Button>
        )}
        {contrato.status === "contrato_assinado" && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Assinado
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-amber-500"
          title="Arquivar"
          onClick={() => onDelete(contrato)}
        >
          <Archive className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

const ContratosPage = () => {
  const { data: contratos = [], isLoading } = useContratos();
  const { data: deletedContratos = [] } = useDeletedContratos();
  const updateContrato = useUpdateContrato();
  const uploadFile = useUploadContratoFile();
  const deleteContrato = useDeleteContrato();
  const restoreContrato = useRestoreContrato();
  const permanentDelete = usePermanentDeleteContrato();

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contrato | null>(null);
  const [permDeleteTarget, setPermDeleteTarget] = useState<Contrato | null>(null);
  const [signTarget, setSignTarget] = useState<Contrato | null>(null);
  const [viewContrato, setViewContrato] = useState<Contrato | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterServico, setFilterServico] = useState("");
  const [filterData, setFilterData] = useState<"todos" | "este_mes" | "proximos_30" | "atrasados">("todos");

  const servicoOptions = useMemo(() => {
    const unique = [...new Set(contratos.map((c) => c.tipo_servico).filter(Boolean))] as string[];
    return unique.sort();
  }, [contratos]);

  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const match = [c.nome_cliente, c.tipo_servico, c.local_evento, c.whatsapp, c.email, c.pacote]
          .some((v) => v?.toLowerCase().includes(s));
        if (!match) return false;
      }
      if (filterServico && c.tipo_servico !== filterServico) return false;
      if (filterData !== "todos") {
        if (!c.data_evento) return false;
        const eventDate = parseLocalDate(c.data_evento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (filterData === "este_mes") {
          if (eventDate < startOfMonth(today) || eventDate > endOfMonth(today)) return false;
        } else if (filterData === "proximos_30") {
          if (eventDate < today || eventDate > addDays(today, 30)) return false;
        } else if (filterData === "atrasados") {
          if (eventDate >= today || c.status === "contrato_assinado") return false;
        }
      }
      return true;
    });
  }, [contratos, search, filterServico, filterData]);

  const hasActiveFilters = search.trim() !== "" || filterServico !== "" || filterData !== "todos";

  const clearFilters = () => {
    setSearch("");
    setFilterServico("");
    setFilterData("todos");
  };

  const handleUpload = async (contrato: Contrato, file: File) => {
    setUploadingId(contrato.id);
    try {
      await uploadFile.mutateAsync({ contratoId: contrato.id, file });
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteContrato.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handlePermDelete = async () => {
    if (!permDeleteTarget) return;
    await permanentDelete.mutateAsync(permDeleteTarget.id);
    setPermDeleteTarget(null);
  };

  const handleMarkSigned = async () => {
    if (!signTarget) return;
    await updateContrato.mutateAsync({ id: signTarget.id, status: "contrato_assinado" });
    toast.success("Contrato marcado como assinado!");
    setSignTarget(null);
  };

  const totalPorStatus = (status: ContratoStatus) =>
    contratosFiltrados.filter((c) => c.status === status).length;

  const DATE_FILTERS: { value: typeof filterData; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "este_mes", label: "Este mês" },
    { value: "proximos_30", label: "Próximos 30 dias" },
    { value: "atrasados", label: "Atrasados" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Contratos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contratosFiltrados.length} de {contratos.length} contrato{contratos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowArchived((v) => !v)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Arquivados
          {deletedContratos.length > 0 && (
            <span className="ml-0.5 bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
              {deletedContratos.length}
            </span>
          )}
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, serviço, local..."
              className="pl-9 bg-muted border-border"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 text-muted-foreground">
              <X className="w-3.5 h-3.5" /> Limpar
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

          {/* Date filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterData(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  filterData === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Service filter */}
          {servicoOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-l border-border pl-2 ml-1">
              {servicoOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterServico(filterServico === s ? "" : s)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    filterServico === s
                      ? "bg-primary/10 text-primary border-primary/40"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATUS_COLUMNS.map((col) => {
            const colContratos = contratosFiltrados.filter((c) => c.status === col.status);
            return (
              <div key={col.status} className="flex flex-col gap-3">
                {/* Column header */}
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className="font-semibold text-sm text-foreground">{col.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {totalPorStatus(col.status)}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-3">
                  {colContratos.length === 0 ? (
                    <div className="border border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground">
                      Nenhum contrato
                    </div>
                  ) : (
                    colContratos.map((contrato) => (
                      <ContratoCard
                        key={contrato.id}
                        contrato={contrato}
                        onUpload={handleUpload}
                        onDelete={setDeleteTarget}
                        onMarkSigned={setSignTarget}
                        onView={setViewContrato}
                        uploading={uploadingId === contrato.id}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived panel */}
      {showArchived && (
        <div className="border border-border rounded-xl p-4">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-foreground mb-3">
            <Archive className="w-4 h-4 text-muted-foreground" /> Contratos Arquivados
            <span className="text-xs text-muted-foreground ml-1">({deletedContratos.length})</span>
          </h2>
          {deletedContratos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum contrato arquivado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {deletedContratos.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 opacity-70">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.nome_cliente}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.tipo_servico || "—"}{c.data_evento ? ` · ${formatDate(c.data_evento)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => restoreContrato.mutate(c.id)}>
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" title="Excluir permanentemente" onClick={() => setPermDeleteTarget(c)}>
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ContratoDrawer */}
      <ContratoDrawer
        contrato={viewContrato}
        open={!!viewContrato}
        onClose={() => setViewContrato(null)}
      />

      {/* Archive (soft delete) confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Arquivar contrato</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato de{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.nome_cliente}</span>{" "}
              será arquivado e poderá ser restaurado depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={handleDelete}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete confirmation */}
      <AlertDialog open={!!permDeleteTarget} onOpenChange={(v) => !v && setPermDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato de{" "}
              <span className="font-semibold text-foreground">{permDeleteTarget?.nome_cliente}</span>{" "}
              será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handlePermDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as signed confirmation */}
      <AlertDialog open={!!signTarget} onOpenChange={(v) => !v && setSignTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Confirmar assinatura
            </AlertDialogTitle>
            <AlertDialogDescription>
              Marcar o contrato de{" "}
              <span className="font-semibold text-foreground">{signTarget?.nome_cliente}</span> como assinado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-500 text-white hover:bg-emerald-600"
              onClick={handleMarkSigned}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContratosPage;
