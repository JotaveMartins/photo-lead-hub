import { useState, useMemo } from "react";
import { DollarSign, ChevronLeft, ChevronRight, Search, Plus, TrendingDown, Clock, Hash, Tag, PieChart, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import NovaDespesaModal from "@/components/financeiro/NovaDespesaModal";
import { useDespesas, useDeleteDespesa, type Despesa } from "@/hooks/useDespesas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORY_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

const DespesasPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: despesas = [], isLoading } = useDespesas(currentMonth);
  const deleteDespesa = useDeleteDespesa();

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const filtered = useMemo(() => {
    if (!search.trim()) return despesas;
    const q = search.toLowerCase();
    return despesas.filter((d) =>
      d.descricao.toLowerCase().includes(q) || d.categoria.toLowerCase().includes(q)
    );
  }, [despesas, search]);

  // Stats
  const totalMes = despesas.reduce((s, d) => s + d.valor, 0);
  const previstas = despesas.filter((d) => d.status === "prevista").reduce((s, d) => s + d.valor, 0);
  const pagas = despesas.filter((d) => d.status === "paga").reduce((s, d) => s + d.valor, 0);
  const qtd = despesas.length;
  const media = qtd > 0 ? totalMes / qtd : 0;

  // Category aggregation
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    despesas.forEach((d) => map.set(d.categoria, (map.get(d.categoria) || 0) + d.valor));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [despesas]);

  const maiorCategoria = byCategory.length > 0 ? byCategory[0].name : "—";

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      await deleteDespesa.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-primary" />
            Despesas
          </h1>
          <p className="text-sm text-muted-foreground">Controle e organize todos os gastos do seu negócio</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar despesa
        </Button>
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

      {/* Search + Month Nav */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar despesa..."
              className="bg-muted border-border pl-8 h-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center uppercase">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">{filtered.length} despesas</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Distribuição de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa registrada neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa registrada neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar despesa
            </Button>
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
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="border-border">
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{d.descricao}</p>
                    {d.parcela_numero && (
                      <p className="text-xs text-muted-foreground">Parcela {d.parcela_numero}/{d.parcela_total}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{d.categoria}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(d.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm font-bold text-foreground">
                    {formatCurrency(d.valor)}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${d.status === "paga" ? "text-primary" : "text-yellow-500"}`}>
                      {d.status === "paga" ? "Paga" : "Prevista"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">{d.forma_pagamento}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(d.id)}>
                      ×
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <NovaDespesaModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
};

export default DespesasPage;
