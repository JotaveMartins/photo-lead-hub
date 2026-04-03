import { Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import type { Cobranca } from "@/hooks/useCobrancas";
import { useUpdateCobranca, useDeleteCobranca } from "@/hooks/useCobrancas";
import { useClientes } from "@/hooks/useClientes";
import { toast } from "sonner";

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
};

const STATUS_STYLES: Record<string, string> = {
  aguardando: "bg-[hsl(var(--status-warning))]/20 text-[hsl(var(--status-warning))]",
  paga: "bg-[hsl(var(--status-success))]/20 text-[hsl(var(--status-success))]",
  vencida: "bg-destructive/20 text-destructive",
};

interface CobrancaTableProps {
  cobrancas: Cobranca[];
  onEdit: (c: Cobranca) => void;
  search: string;
}

const CobrancaTable = ({ cobrancas, onEdit, search }: CobrancaTableProps) => {
  const updateCobranca = useUpdateCobranca();
  const deleteCobranca = useDeleteCobranca();
  const { data: clientes = [] } = useClientes();
  const navigate = useNavigate();

  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const today = new Date().toISOString().split("T")[0];

  // Compute effective status (auto-vencida)
  const getEffectiveStatus = (c: Cobranca) => {
    if (c.status === "paga") return "paga";
    if (c.vencimento < today) return "vencida";
    return "aguardando";
  };

  const filtered = cobrancas.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.descricao || "").toLowerCase().includes(q) ||
      PAYMENT_LABELS[c.forma_pagamento]?.toLowerCase().includes(q)
    );
  });

  const togglePaga = async (c: Cobranca) => {
    const isPaga = c.status === "paga";
    try {
      await updateCobranca.mutateAsync({
        id: c.id,
        status: isPaga ? "aguardando" : "paga",
        data_pagamento: isPaga ? null : new Date().toISOString().split("T")[0],
      } as any);
      toast.success(isPaga ? "Cobrança desmarcada como paga" : "Cobrança marcada como paga!");
    } catch {
      toast.error("Erro ao atualizar cobrança");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta cobrança?")) return;
    try {
      await deleteCobranca.mutateAsync(id);
    } catch {
      toast.error("Erro ao excluir cobrança");
    }
  };

  if (filtered.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <p className="font-semibold text-foreground">Nenhuma cobrança encontrada</p>
        <p className="text-sm text-muted-foreground">
          Não há cobranças cadastradas para este período. Clique em "Adicionar cobrança" para criar uma nova.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-4">Descrição</th>
              <th className="text-left p-4">Valor</th>
              <th className="text-left p-4">Cliente</th>
              <th className="text-left p-4">Parcela</th>
              <th className="text-left p-4">Forma de Pagamento</th>
              <th className="text-left p-4">Vencimento</th>
              <th className="text-left p-4">Status</th>
              <th className="text-center p-4">Paga</th>
              <th className="text-center p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const effectiveStatus = getEffectiveStatus(c);
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-foreground">{c.descricao || "—"}</td>
                  <td className="p-4 font-medium text-foreground">
                    R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4">
                    {(c as any).cliente_id && clienteMap[(c as any).cliente_id] ? (
                      <button
                        onClick={() => navigate(`/clientes/${(c as any).cliente_id}`)}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        {clienteMap[(c as any).cliente_id].nome}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {c.parcela_numero && c.parcela_total
                      ? `${c.parcela_numero}/${c.parcela_total}`
                      : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground">{PAYMENT_LABELS[c.forma_pagamento] || c.forma_pagamento}</td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[effectiveStatus]}`}>
                      {effectiveStatus === "paga" ? "Paga" : effectiveStatus === "vencida" ? "Vencida" : "Aguardando"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={c.status === "paga"}
                      onCheckedChange={() => togglePaga(c)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onEdit(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CobrancaTable;
