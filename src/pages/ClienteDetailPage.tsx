import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateCliente, useDeleteCliente, type Cliente } from "@/hooks/useClientes";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Trash2, Phone, Mail, MapPin, FileText, DollarSign, User, Receipt, Calendar, Package, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EditClienteModal from "@/components/clientes/EditClienteModal";
import type { Cobranca } from "@/hooks/useCobrancas";

const ClienteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const effectiveUserId = useEffectiveUserId();
  const deleteCliente = useDeleteCliente();
  const [editOpen, setEditOpen] = useState(false);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Cliente;
    },
    enabled: !!id,
  });

  const { data: cobrancas = [] } = useQuery({
    queryKey: ["cobrancas-cliente", id],
    queryFn: async () => {
      if (!id || !effectiveUserId) return [];
      const { data, error } = await supabase
        .from("cobrancas")
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("cliente_id", id)
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return (data || []) as Cobranca[];
    },
    enabled: !!id && !!effectiveUserId,
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["events-cliente", id],
    queryFn: async () => {
      if (!id || !effectiveUserId) return [];
      const { data, error } = await supabase
        .from("events")
        .select("*, services(nome)")
        .eq("user_id", effectiveUserId)
        .eq("cliente_id", id)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!effectiveUserId,
  });

  const handleDelete = async () => {
    if (!id) return;
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      await deleteCliente.mutateAsync(id);
      navigate("/clientes");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const totalCobrancas = cobrancas.reduce((sum, c) => sum + c.valor, 0);
  const totalRecebido = cobrancas.filter((c) => c.status === "paga").reduce((sum, c) => sum + c.valor, 0);
  const totalPendente = totalCobrancas - totalRecebido;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/clientes")}
            className="flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            CLIENTES
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mb-1">
          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-300">
            ATIVO
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-1">{cliente.nome}</h1>
        {cliente.whatsapp && (
          <p className="flex items-center gap-2 text-sm text-primary-foreground/70">
            <Phone className="w-3.5 h-3.5" />
            {cliente.whatsapp}
          </p>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-lg bg-primary-foreground/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/60 mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              COBRANÇAS
            </div>
            <p className="text-lg font-bold">
              {totalCobrancas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-primary-foreground/50">{cobrancas.length} cobranças</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/60 mb-1">
              <Receipt className="w-3.5 h-3.5" />
              RECEBIDO
            </div>
            <p className="text-lg font-bold">
              {totalRecebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/60 mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              A RECEBER
            </div>
            <p className="text-lg font-bold">
              {totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="bg-muted/50 w-full justify-start">
          <TabsTrigger value="dados" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="cobrancas" className="gap-1.5">
            <DollarSign className="w-4 h-4" />
            Cobranças
          </TabsTrigger>
        </TabsList>

        {/* Tab: Dados */}
        <TabsContent value="dados" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <User className="w-4 h-4" />
                Contratante Principal
              </div>

              <div className="divide-y divide-border">
                <InfoRow icon={<User className="w-4 h-4" />} label="NOME COMPLETO" value={cliente.nome} />
                {cliente.cpf_cnpj && <InfoRow icon={<FileText className="w-4 h-4" />} label="CPF/CNPJ" value={cliente.cpf_cnpj} />}
                {cliente.email && <InfoRow icon={<Mail className="w-4 h-4" />} label="EMAIL" value={cliente.email} />}
                {cliente.whatsapp && <InfoRow icon={<Phone className="w-4 h-4" />} label="WHATSAPP" value={cliente.whatsapp} />}
                {cliente.endereco && <InfoRow icon={<MapPin className="w-4 h-4" />} label="ENDEREÇO" value={cliente.endereco} />}
                {cliente.origem && <InfoRow icon={<FileText className="w-4 h-4" />} label="ORIGEM" value={cliente.origem} />}
                {cliente.observacoes && <InfoRow icon={<FileText className="w-4 h-4" />} label="OBSERVAÇÕES" value={cliente.observacoes} />}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Criado em {format(new Date(cliente.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            <span>Atualizado em {format(new Date(cliente.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </TabsContent>

        {/* Tab: Cobranças */}
        <TabsContent value="cobrancas" className="mt-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">TOTAL</p>
                <p className="text-xl font-bold text-foreground">
                  {totalCobrancas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <p className="text-xs text-green-600 uppercase mb-1">RECEBIDO</p>
                <p className="text-xl font-bold text-green-600">
                  {totalRecebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </CardContent>
            </Card>
          </div>

          <Button
            variant="outline"
            className="w-full mb-6"
            onClick={() => navigate("/financeiro/cobrancas")}
          >
            Gerenciar Cobranças
          </Button>

          {cobrancas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <DollarSign className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">Nenhuma cobrança cadastrada</p>
              <p className="text-sm text-muted-foreground/70">Para adicionar cobranças, acesse a página Cobranças</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cobrancas.map((cob) => (
                <div key={cob.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{cob.descricao || "Cobrança"}</p>
                    <p className="text-xs text-muted-foreground">
                      Venc. {format(new Date(cob.vencimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      {cob.parcela_numero && ` • Parcela ${cob.parcela_numero}/${cob.parcela_total}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {cob.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <span className={`text-xs font-medium ${
                      cob.status === "paga" ? "text-green-500" : cob.status === "vencida" ? "text-destructive" : "text-yellow-500"
                    }`}>
                      {cob.status === "paga" ? "Paga" : cob.status === "vencida" ? "Vencida" : "Aguardando"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 text-xs text-muted-foreground">
            <span>Criado em {format(new Date(cliente.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            <span>Atualizado em {format(new Date(cliente.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </TabsContent>
      </Tabs>

      <EditClienteModal open={editOpen} onClose={() => setEditOpen(false)} cliente={cliente} />
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3 py-4">
    <div className="mt-0.5 text-muted-foreground">{icon}</div>
    <div>
      <p className="text-xs font-semibold text-primary uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  </div>
);

export default ClienteDetailPage;
