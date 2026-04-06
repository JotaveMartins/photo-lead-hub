import { useState, useMemo } from "react";
import { DollarSign, ChevronLeft, ChevronRight, Search, Plus, TrendingDown, Clock, Hash, Tag, PieChart, BarChart3, Pencil, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NovaDespesaModal from "@/components/financeiro/NovaDespesaModal";
import GenericTrashBin from "@/components/GenericTrashBin";
import { useDespesas, useDeleteDespesa, useDeletedDespesas, useRestoreDespesa, usePermanentDeleteDespesa, type Despesa } from "@/hooks/useDespesas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORY_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
  },
  itemStyle: { color: "hsl(var(--foreground))" },
  labelStyle: { color: "hsl(var(--foreground))" },
};

const DespesasPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterPagamento, setFilterPagamento] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);

  const { data: despesas = [], isLoading } = useDespesas(currentMonth);
  const { data: deletedDespesas = [] } = useDeletedDespesas();
  const deleteDespesa = useDeleteDespesa();
  const restoreDespesa = useRestoreDespesa();
  const permanentDeleteDespesa = usePermanentDeleteDespesa();

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // Unique categories from data
  const categorias = useMemo(() => {
    const set = new Set(despesas.map((d) => d.categoria));
    return Array.from(set).sort();
  }, [despesas]);

  const filtered = useMemo(() => {
    return despesas.filter((d) => {
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (filterCategoria !== "all" && d.categoria !== filterCategoria) return false;
      if (filterPagamento !== "all" && d.forma_pagamento !== filterPagamento) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          d.descricao.toLowerCase().includes(q) ||
          d.categoria.toLowerCase().includes(q) ||
          d.observacoes?.toLowerCase().includes(q) ||
          format(new Date(d.data + "T12:00:00"), "dd/MM/yyyy").includes(q)
        );
      }
      return true;
    });
  }, [despesas, search, filterStatus, filterCategoria, filterPagamento]);

  const totalMes = despesas.reduce((s, d) => s + d.valor, 0);
  const previstas = despesas.filter((d) => d.status === "prevista").reduce((s, d) => s + d.valor, 0);
  const pagas = despesas.filter((d) => d.status === "paga").reduce((s, d) => s + d.valor, 0);
  const qtd = despesas.length;
  const media = qtd > 0 ? totalMes / qtd : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    despesas.forEach((d) => map.set(d.categoria, (map.get(d.categoria) || 0) + d.valor));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [despesas]);

  const maiorCategoria = byCategory.length > 0 ? byCategory[0].name : "—";

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const openEdit = (d: Despesa) => { setEditingDespesa(d); setModalOpen(true); };
  const openNew = () => { setEditingDespesa(null); setModalOpen(true); };

  const trashItems = deletedDespesas.map(d => ({
    id: d.id, label: d.descricao, sublabel: formatCurrency(d.valor), deleted_at: d.deleted_at!,
  }));

  const hasActiveFilters = filterStatus !== "all" || filterCategoria !== "all" || filterPagamento !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-primary" />
            Despesas
          </h1>
          <p className="text-sm text-muted-foreground">Controle e organize todos os gastos do seu negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <GenericTrashBin
            items={trashItems}
            onRestore={(id) => restoreDespesa.mutate(id)}
            onPermanentDelete={(id) => permanentDeleteDespesa.mutate(id)}
            isRestoring={restoreDespesa.isPending}
            entityName="despesa"
          />
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar despesa
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-primary uppercase mb-1">Despesas do Mês</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalMes)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-accent-foreground uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Previstas</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(previstas)}</p>
            <p className="text-xs text-muted-foreground">{despesas.filter(d => d.status === "prevista").length} despesas previstas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase mb-1">Total Pago</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(pagas)}</p>
            <p className="text-xs text-muted-foreground">{despesas.filter(d => d.status === "paga").length} despesas pagas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Quantidade</p>
            <p className="text-xl font-bold text-foreground">{qtd}</p>
            <p className="text-xs text-muted-foreground">Média: {formatCurrency(media)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Maior Categoria</p>
            <p className="text-xl font-bold text-foreground">{maiorCategoria}</p>
            {byCategory.length > 0 && <p className="text-xs text-muted-foreground">{formatCurrency(byCategory[0].value)}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters + Month Nav */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição, categoria..." className="bg-muted border-border pl-8 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium text-foreground min-w-[140px] text-center uppercase">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            <span className="text-sm text-muted-foreground ml-2">{filtered.length} despesas</span>
          </div>
        </div>

        {/* Dropdown filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Filter className="w-3.5 h-3.5" />Filtros:</div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-muted border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
              <SelectItem value="prevista">Prevista</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[150px] h-8 text-xs bg-muted border-border">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPagamento} onValueChange={setFilterPagamento}>
            <SelectTrigger className="w-[150px] h-8 text-xs bg-muted border-border">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas formas</SelectItem>
              <SelectItem value="pix">Pix</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setFilterStatus("all"); setFilterCategoria("all"); setFilterPagamento("all"); }}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><PieChart className="w-4 h-4 text-primary" />Distribuição de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa registrada neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                    {byCategory.map((_, i) => (<Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} {...tooltipStyle} />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa registrada neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} {...tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <DollarSign className="w-12 h-12 text-muted-foreground/30" />
            <p className="font-medium text-foreground">Nenhuma despesa encontrada</p>
            <p className="text-sm text-muted-foreground">Adicione sua primeira despesa para começar a controlar</p>
            <Button variant="outline" size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Adicionar despesa</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="border-border cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => openEdit(d)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{d.descricao}</p>
                    {d.parcela_numero && <p className="text-xs text-muted-foreground">Parcela {d.parcela_numero}/{d.parcela_total}</p>}
                  </TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{d.categoria}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(d.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="text-sm font-bold text-foreground">{formatCurrency(d.valor)}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${d.status === "paga" ? "text-primary" : "text-yellow-500"}`}>
                      {d.status === "paga" ? "Paga" : "Prevista"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{PAYMENT_LABELS[d.forma_pagamento] || d.forma_pagamento}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(d)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteDespesa.mutate(d.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <NovaDespesaModal open={modalOpen} onOpenChange={setModalOpen} despesa={editingDespesa} />
    </div>
  );
};

export default DespesasPage;
