import { useState } from "react";
import NovoClienteModal from "@/components/clientes/NovoClienteModal";
import NovaCobrancaModal from "@/components/financeiro/NovaCobrancaModal";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Receipt, CreditCard, ArrowDownUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type CobrancaType = "unica" | "parcelas" | "entrada_parcelas";

interface LeadToClienteFlowProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

const LeadToClienteFlow = ({ lead, open, onClose }: LeadToClienteFlowProps) => {
  const [step, setStep] = useState<"cliente" | "tipo" | "cobranca">("cliente");
  const [createdClienteId, setCreatedClienteId] = useState<string | null>(null);
  const [cobrancaType, setCobrancaType] = useState<CobrancaType>("unica");

  const handleClienteCreated = (clienteId: string) => {
    setCreatedClienteId(clienteId);
    setStep("tipo");
  };

  const handleSelectType = (type: CobrancaType) => {
    setCobrancaType(type);
    setStep("cobranca");
  };

  const handleClose = () => {
    setStep("cliente");
    setCreatedClienteId(null);
    onClose();
  };

  if (!open || !lead) return null;

  return (
    <>
      {step === "cliente" && (
        <NovoClienteModal
          open={true}
          onClose={handleClose}
          initialData={{
            nome: lead.nome,
            whatsapp: lead.whatsapp,
            origem: lead.origem || "",
          }}
          onClienteCreated={handleClienteCreated}
        />
      )}

      {step === "tipo" && (
        <AlertDialog open={true} onOpenChange={(v) => { if (!v) handleClose(); }}>
          <AlertDialogContent className="bg-card border-border sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Cliente cadastrado! 🎉</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja criar uma cobrança para este cliente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-3 gap-3 py-2">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectType("unica")}
              >
                <Receipt className="w-6 h-6 text-primary" />
                <span className="font-medium text-foreground text-xs">Cobrança Única</span>
                <span className="text-[10px] text-muted-foreground">Pagamento avulso</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectType("parcelas")}
              >
                <CreditCard className="w-6 h-6 text-primary" />
                <span className="font-medium text-foreground text-xs">Parcelas</span>
                <span className="text-[10px] text-muted-foreground">Dividir em parcelas</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 border-border hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectType("entrada_parcelas")}
              >
                <ArrowDownUp className="w-6 h-6 text-primary" />
                <span className="font-medium text-foreground text-xs">Entrada + Parcelas</span>
                <span className="text-[10px] text-muted-foreground">Entrada + restante parcelado</span>
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>Pular</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {step === "cobranca" && (
        <NovaCobrancaModal
          open={true}
          onOpenChange={(v) => { if (!v) handleClose(); }}
          type={cobrancaType}
          initialClienteId={createdClienteId || undefined}
          initialValor={lead.valor || undefined}
        />
      )}
    </>
  );
};

export default LeadToClienteFlow;
