import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateCliente, useDeleteCliente, type Cliente } from "@/hooks/useClientes";
import { useContratosByClienteId, type Contrato } from "@/hooks/useContratos";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Trash2, Phone, Mail, MapPin, FileText, DollarSign, User, Receipt, Calendar, Package, Wrench, TrendingDown, BarChart3, CheckSquare, Plus, Circle, Hourglass, Send, CheckCircle2, Eye } from "lucide-react";
import ContratoDrawer from "@/components/contratos/ContratoDrawer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import EditClienteModal from "@/components/clientes/EditClienteModal";
import type { Cobranca } from "@/hooks/useCobrancas";
import { useClienteTasks, useCreateLeadTask, useCompleteLeadTask } from "@/hooks/useLeadTasks";
import { Input } from "@/components/ui/input";
import DatePickerField from "@/components/DatePickerField";
import { parseLocalDate } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ClienteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "dados";
  const setTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    setSearchParams(next, { replace: true });
  };
  const effectiveUserId = useEffectiveUserId();
  const deleteCliente = useDeleteCliente();
  const [editOpen, setEditOpen] = useState(false);
  const [viewContrato, setViewContrato] = useState<Contrato | null>(null);
  const { data: clienteTasks = [] } = useClienteTasks(id);
  const { data: contratos = [] } = useContratosByClienteId(id);
  const createTask = useCreateLeadTask();
  const completeTask = useCompleteLeadTask();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(() => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  });

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("clientes").select("*").eq("id", id).single();
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
        .from("cobrancas").select("*")
        .eq("user_id", effectiveUserId).eq("cliente_id", id)
        .is("deleted_at", null)
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
        .from("events").select("*, services(nome, valor_base, custo_interno)")
        .eq("user_id", effectiveUserId).eq("cliente_id", id)
        .is("deleted_at", null)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!effectiveUserId,
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["despesas-cliente", id],
    queryFn: async () => {
      if (!id || !effectiveUserId) return [];
      // Despesas vinculadas a eventos deste cliente
      const eventIds = eventos.map((e: any) => e.id);
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("despesas").select("*")
        .eq("user_id", effectiveUserId)
        .in("evento_id", eventIds)
        .is("deleted_at", null)
        .order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!effectiveUserId && eventos.length > 0,
  });

  // Serviços únicos contratados (via eventos)
  const servicosContratados = (() => {
    const map = new Map<string, { nome: string; valor_base: number; custo_interno: number | null; count: number }>();
    eventos.forEach((ev: any) => {
      if (ev.services && ev.service_id) {
        const s = ev.services as { nome: string; valor_base: number; custo_interno: number | null };
        const existing = map.get(ev.service_id);
        if (existing) { existing.count++; }
        else { map.set(ev.service_id, { nome: s.nome, valor_base: s.valor_base, custo_interno: s.custo_interno, count: 1 }); }
      }
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  })();

  const { data: pacotesContratados = [] } = useQuery({
    queryKey: ["packages-cliente", id, effectiveUserId],
    queryFn: async () => {
      if (!id || !effectiveUserId) return [];
      const { data: pkgs } = await supabase.from("packages").select("id, nome, preco_final, descricao").eq("user_id", effectiveUserId);
      if (!pkgs) return [];
      const clienteCobrancas = cobrancas.map(c => c.descricao?.toLowerCase() || "");
      const uniquePackages = new Map<string, { nome: string; preco_final: number | null }>();
      pkgs.forEach(pkg => {
        if (clienteCobrancas.some(desc => desc.includes(pkg.nome.toLowerCase()))) {
          uniquePackages.set(pkg.id, { nome: pkg.nome, preco_final: pkg.preco_final });
        }
      });
      return Array.from(uniquePackages.entries()).map(([id, v]) => ({ id, ...v }));
    },
    enabled: !!id && !!effectiveUserId && cobrancas.length >= 0,
  });

  const handleDelete = async () => {
    if (!id) return;
    if (confirm("Arquivar este cliente? Ele poderá ser restaurado em Clientes > Arquivados.")) {
      await deleteCliente.mutateAsync(id);
      navigate("/clientes");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/clientes")}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
      </div>
    );
  }

  const totalCobrancas = cobrancas.reduce((sum, c) => sum + c.valor, 0);
  const totalRecebido = cobrancas.filter(c => c.status === "paga").reduce((sum, c) => sum + c.valor, 0);
  const totalPendente = totalCobrancas - totalRecebido;

  // Relatório metrics
  const custoExecucaoEsperado = servicosContratados.reduce((sum, s) => sum + (s.custo_interno || 0) * s.count, 0);
  const totalDespesasLancadas = despesas.reduce((sum: number, d: any) => sum + Number(d.valor), 0);
  const lucroEstimado = totalRecebido - totalDespesasLancadas;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/90 to-primary p-4 sm:p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <button onClick={() => navigate("/clientes")} className="flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />CLIENTES
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-1" />Editar
            </Button>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mb-1"><span className="inline-block px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-green-500/20 text-green-300">ATIVO</span></div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1 break-words">{cliente.nome}</h1>
        {cliente.whatsapp && <p className="flex items-center gap-2 text-xs sm:text-sm text-primary-foreground/70"><Phone className="w-3.5 h-3.5" />{cliente.whatsapp}</p>}

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-5">
          <div className="rounded-lg bg-primary-foreground/10 p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-[9px] sm:text-xs text-primary-foreground/60 mb-1 uppercase"><DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /><span className="truncate">Cobranças</span></div>
            <p className="text-sm sm:text-lg font-bold truncate">{fmt(totalCobrancas)}</p>
            <p className="text-[10px] sm:text-xs text-primary-foreground/50 truncate">{cobrancas.length} cobranças</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-[9px] sm:text-xs text-primary-foreground/60 mb-1 uppercase"><Receipt className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /><span className="truncate">Recebido</span></div>
            <p className="text-sm sm:text-lg font-bold truncate">{fmt(totalRecebido)}</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-2 sm:p-3 min-w-0">
            <div className="flex items-center gap-1 text-[9px] sm:text-xs text-primary-foreground/60 mb-1 uppercase"><DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /><span className="truncate">A receber</span></div>
            <p className="text-sm sm:text-lg font-bold truncate">{fmt(totalPendente)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tabParam} onValueChange={setTab} className="w-full">
        <TabsList className="bg-muted/50 w-full justify-start flex-wrap">
          <TabsTrigger value="dados" className="gap-1.5"><FileText className="w-4 h-4" />Dados</TabsTrigger>
          <TabsTrigger value="contratos" className="gap-1.5"><FileText className="w-4 h-4" />Contratos{contratos.length > 0 && <span className="ml-1 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{contratos.length}</span>}</TabsTrigger>
          <TabsTrigger value="cobrancas" className="gap-1.5"><DollarSign className="w-4 h-4" />Cobranças</TabsTrigger>
          <TabsTrigger value="despesas" className="gap-1.5"><TrendingDown className="w-4 h-4" />Despesas</TabsTrigger>
          <TabsTrigger value="servicos" className="gap-1.5"><Wrench className="w-4 h-4" />Serviços</TabsTrigger>
          <TabsTrigger value="agenda" className="gap-1.5"><Calendar className="w-4 h-4" />Agenda</TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-1.5"><CheckSquare className="w-4 h-4" />Tarefas</TabsTrigger>
          <TabsTrigger value="relatorio" className="gap-1.5"><BarChart3 className="w-4 h-4" />Relatório</TabsTrigger>
        </TabsList>

        {/* Tab: Dados */}
        <TabsContent value="dados" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide"><User className="w-4 h-4" />Contratante Principal</div>
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
            <span>Criado em {format(new Date(cliente.created_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            <span>Atualizado em {format(new Date(cliente.updated_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </TabsContent>

        {/* Tab: Contratos */}
        <TabsContent value="contratos" className="mt-4">
          {contratos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">Nenhum contrato vinculado</p>
              <p className="text-sm text-muted-foreground/70">Contratos aparecem aqui quando vinculados a este cliente</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/contratos")}>Ir para Contratos</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {contratos.map((c) => {
                const statusInfo = {
                  aguardando_contrato: { icon: <Hourglass className="w-3.5 h-3.5" />, label: "Aguardando", cls: "text-yellow-500" },
                  contrato_enviado: { icon: <Send className="w-3.5 h-3.5" />, label: "Enviado", cls: "text-blue-500" },
                  contrato_assinado: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Assinado", cls: "text-emerald-500" },
                }[c.status as string] ?? { icon: null, label: c.status, cls: "text-muted-foreground" };
                return (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {c.tipo_servico || "Contrato"}{c.pacote ? ` · ${c.pacote}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.data_evento ? format(new Date(c.data_evento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        {c.valor != null && ` · ${c.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`flex items-center gap-1 text-[11px] font-medium ${statusInfo.cls}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setViewContrato(c)}>
                        <Eye className="w-3 h-3" /> Ver
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Cobranças */}
        <TabsContent value="cobrancas" className="mt-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase mb-1">TOTAL</p><p className="text-xl font-bold text-foreground">{fmt(totalCobrancas)}</p></CardContent></Card>
            <Card className="bg-green-500/5 border-green-500/20"><CardContent className="p-4"><p className="text-xs text-green-600 uppercase mb-1">RECEBIDO</p><p className="text-xl font-bold text-green-600">{fmt(totalRecebido)}</p></CardContent></Card>
          </div>
          <Button variant="outline" className="w-full mb-6" onClick={() => navigate("/financeiro/cobrancas")}>Gerenciar Cobranças</Button>
          {cobrancas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <DollarSign className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">Nenhuma cobrança cadastrada</p>
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
                    <p className="text-sm font-bold text-foreground">{fmt(cob.valor)}</p>
                    <span className={`text-xs font-medium ${cob.status === "paga" ? "text-green-500" : cob.status === "vencida" ? "text-destructive" : "text-yellow-500"}`}>
                      {cob.status === "paga" ? "Paga" : cob.status === "vencida" ? "Vencida" : "Aguardando"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Despesas */}
        <TabsContent value="despesas" className="mt-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">TOTAL DESPESAS</p>
                <p className="text-xl font-bold text-foreground">{fmt(totalDespesasLancadas)}</p>
                <p className="text-xs text-muted-foreground">{despesas.length} lançamentos</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">CUSTO ESPERADO</p>
                <p className="text-xl font-bold text-foreground">{fmt(custoExecucaoEsperado)}</p>
                <p className="text-xs text-muted-foreground">baseado nos serviços</p>
              </CardContent>
            </Card>
          </div>
          <Button variant="outline" className="w-full mb-6" onClick={() => navigate("/financeiro/despesas")}>Gerenciar Despesas</Button>
          {despesas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <TrendingDown className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">Nenhuma despesa vinculada</p>
              <p className="text-sm text-muted-foreground/70">Despesas aparecem aqui quando vinculadas aos eventos deste cliente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {despesas.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => navigate("/financeiro/despesas")}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(d.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })} • {d.categoria}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{fmt(Number(d.valor))}</p>
                    <span className={`text-xs font-medium ${d.status === "paga" ? "text-green-500" : "text-yellow-500"}`}>
                      {d.status === "paga" ? "Paga" : "Prevista"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Serviços & Pacotes */}
        <TabsContent value="servicos" className="mt-4">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3"><Wrench className="w-4 h-4" />Serviços Contratados</h3>
            {servicosContratados.length === 0 ? (
              <Card className="bg-card border-border"><CardContent className="flex flex-col items-center justify-center py-8 gap-2"><Wrench className="w-8 h-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Nenhum serviço vinculado</p><p className="text-xs text-muted-foreground/70">Serviços aparecem aqui quando eventos são criados para este cliente</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {servicosContratados.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => navigate("/servicos")}>
                    <div><p className="text-sm font-medium text-foreground">{s.nome}</p><p className="text-xs text-muted-foreground">{s.count} {s.count === 1 ? "evento" : "eventos"}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-foreground">{fmt(s.valor_base)}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3"><Package className="w-4 h-4" />Pacotes Contratados</h3>
            {pacotesContratados.length === 0 ? (
              <Card className="bg-card border-border"><CardContent className="flex flex-col items-center justify-center py-8 gap-2"><Package className="w-8 h-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Nenhum pacote vinculado</p><p className="text-xs text-muted-foreground/70">Pacotes aparecem aqui quando identificados nas cobranças deste cliente</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {pacotesContratados.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => navigate("/pacotes")}>
                    <div><p className="text-sm font-medium text-foreground">{p.nome}</p></div>
                    <div className="text-right">{p.preco_final && <p className="text-sm font-bold text-foreground">{fmt(p.preco_final)}</p>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Agenda */}
        <TabsContent value="agenda" className="mt-4">
          {eventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Calendar className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">Nenhum evento agendado</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/agenda")}>Ir para Agenda</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {eventos.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => navigate("/agenda")}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{ev.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ev.data_evento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {ev.tipo && ev.tipo !== "Evento" && ` • ${ev.tipo}`}
                    </p>
                    {ev.local && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{ev.local}</p>}
                  </div>
                  <div className="text-right">
                    {ev.services && <span className="text-xs text-primary font-medium">{(ev.services as { nome: string }).nome}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Tarefas */}
        <TabsContent value="tarefas" className="mt-4 space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-xs text-muted-foreground">Nova tarefa</label>
                  <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Ex: Procurar equipe para o casamento" className="bg-muted border-border" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Data</label>
                  <DatePickerField value={newTaskDate} onChange={setNewTaskDate} />
                </div>
                <Button size="sm" disabled={!newTaskTitle.trim() || createTask.isPending} onClick={async () => {
                  if (!id) return;
                  await createTask.mutateAsync({ cliente_id: id, title: newTaskTitle.trim(), due_date: newTaskDate });
                  setNewTaskTitle("");
                }}>
                  <Plus className="w-4 h-4 mr-1" />Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {clienteTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CheckSquare className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">Nenhuma tarefa para este cliente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clienteTasks.map((t) => (
                <div key={t.id} className={`flex items-center justify-between rounded-lg border border-border p-3 ${t.completed ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {t.completed ? (
                      <CheckSquare className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <button onClick={() => completeTask.mutate(t)} className="text-muted-foreground hover:text-primary">
                        <Circle className="w-4 h-4" />
                      </button>
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                      <p className="text-xs text-muted-foreground">{format(parseLocalDate(t.due_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Relatório */}
        <TabsContent value="relatorio" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">COBRANÇAS EMITIDAS</p>
                <p className="text-xl font-bold text-foreground">{fmt(totalCobrancas)}</p>
                <p className="text-xs text-muted-foreground">{cobrancas.length} cobranças</p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <p className="text-xs text-green-600 uppercase mb-1">VALOR RECEBIDO</p>
                <p className="text-xl font-bold text-green-600">{fmt(totalRecebido)}</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <CardContent className="p-4">
                <p className="text-xs text-yellow-600 uppercase mb-1">A RECEBER</p>
                <p className="text-xl font-bold text-yellow-600">{fmt(totalPendente)}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">CUSTO ESPERADO</p>
                <p className="text-xl font-bold text-foreground">{fmt(custoExecucaoEsperado)}</p>
                <p className="text-xs text-muted-foreground">baseado nos serviços</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase mb-1">DESPESAS LANÇADAS</p>
                <p className="text-xl font-bold text-foreground">{fmt(totalDespesasLancadas)}</p>
                <p className="text-xs text-muted-foreground">{despesas.length} lançamentos</p>
              </CardContent>
            </Card>
            <Card className={`${lucroEstimado >= 0 ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"}`}>
              <CardContent className="p-4">
                <p className={`text-xs uppercase mb-1 ${lucroEstimado >= 0 ? "text-green-600" : "text-destructive"}`}>LUCRO</p>
                <p className={`text-xl font-bold ${lucroEstimado >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(lucroEstimado)}</p>
                <p className="text-xs text-muted-foreground">recebido - despesas</p>
              </CardContent>
            </Card>
          </div>

          {/* Serviços/Pacotes resumo */}
          <Card className="bg-card border-border mb-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2"><Wrench className="w-4 h-4" />Serviços Contratados</h3>
              {servicosContratados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum serviço</p>
              ) : (
                <div className="space-y-2">
                  {servicosContratados.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{s.nome} <span className="text-muted-foreground">×{s.count}</span></span>
                      <span className="font-medium text-foreground">{fmt(s.valor_base * s.count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2"><Package className="w-4 h-4" />Pacotes Contratados</h3>
              {pacotesContratados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pacote</p>
              ) : (
                <div className="space-y-2">
                  {pacotesContratados.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{p.nome}</span>
                      <span className="font-medium text-foreground">{p.preco_final ? fmt(p.preco_final) : "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ContratoDrawer contrato={viewContrato} open={!!viewContrato} onClose={() => setViewContrato(null)} />
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
