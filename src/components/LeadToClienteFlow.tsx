import { useState } from "react";
import NovoClienteModal from "@/components/clientes/NovoClienteModal";
import NovaCobrancaModal from "@/components/financeiro/NovaCobrancaModal";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface LeadToClienteFlowProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

const LeadToClienteFlow = ({ lead, open, onClose }: LeadToClienteFlowProps) => {
  const [step, setStep] = useState<"cliente" | "cobranca" | null>("cliente");
  const [createdClienteId, setCreatedClienteId] = useState<string | null>(null);

  const handleClienteCreated = (clienteId: string) => {
    setCreatedClienteId(clienteId);
    setStep("cobranca");
  };

  const handleClienteSkipped = () => {
    handleClose();
  };

  const handleCobrancaClose = () => {
    handleClose();
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
          onClose={handleClienteSkipped}
          initialData={{
            nome: lead.nome,
            whatsapp: lead.whatsapp,
            origem: lead.origem || "",
          }}
          onClienteCreated={handleClienteCreated}
        />
      )}
      {step === "cobranca" && (
        <NovaCobrancaModal
          open={true}
          onOpenChange={(v) => { if (!v) handleCobrancaClose(); }}
          type="unica"
          initialClienteId={createdClienteId || undefined}
        />
      )}
    </>
  );
};

export default LeadToClienteFlow;
