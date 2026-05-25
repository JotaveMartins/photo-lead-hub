import { useRef, useState } from "react";
import { useContratos, useUpdateContrato, useUploadContratoFile, useDeleteContrato, type Contrato } from "@/hooks/useContratos";
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
  FileText,
  Upload,
  ExternalLink,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Trash2,
  CheckCircle2,
  Send,
  Hourglass,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";

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
  uploading: boolean;
}

const ContratoCard = ({ contrato, onUpload, onDelete, onMarkSigned, uploading }: ContratoCardProps) => {
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
          <>
            {contrato.arquivo_contrato_url && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => window.open(contrato.arquivo_contrato_url!, "_blank")}
              >
                <ExternalLink className="w-3 h-3" /> Ver Contrato
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
              onClick={() => onMarkSigned(contrato)}
            >
              <CheckCircle2 className="w-3 h-3" /> Marcar como Assinado
            </Button>
          </>
        )}
        {contrato.status === "contrato_assinado" && (
          <>
            {contrato.arquivo_contrato_url && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => window.open(contrato.arquivo_contrato_url!, "_blank")}
              >
                <ExternalLink className="w-3 h-3" /> Ver Contrato
              </Button>
            )}
            <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Assinado
            </span>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(contrato)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

const ContratosPage = () => {
  const { data: contratos = [], isLoading } = useContratos();
  const updateContrato = useUpdateContrato();
  const uploadFile = useUploadContratoFile();
  const deleteContrato = useDeleteContrato();

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contrato | null>(null);
  const [signTarget, setSignTarget] = useState<Contrato | null>(null);

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

  const handleMarkSigned = async () => {
    if (!signTarget) return;
    await updateContrato.mutateAsync({ id: signTarget.id, status: "contrato_assinado" });
    toast.success("Contrato marcado como assinado!");
    setSignTarget(null);
  };

  const totalPorStatus = (status: ContratoStatus) =>
    contratos.filter((c) => c.status === status).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Contratos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {contratos.length} contrato{contratos.length !== 1 ? "s" : ""} no total
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATUS_COLUMNS.map((col) => {
            const colContratos = contratos.filter((c) => c.status === col.status);
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato de{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.nome_cliente}</span>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
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
