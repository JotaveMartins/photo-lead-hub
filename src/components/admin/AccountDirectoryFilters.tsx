import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchSelect from "@/components/SearchSelect";
import type { DirectorySegment, DirectoryStatus } from "@/lib/accountSegments";

interface Props {
  segment: DirectorySegment; status: DirectoryStatus; search: string;
  onSegment: (value: DirectorySegment) => void; onStatus: (value: DirectoryStatus) => void;
  onSearch: (value: string) => void;
  counts: { customers: number; trials: number; expiredTrials: number; blocked: number };
  ready: boolean;
}
const AccountDirectoryFilters = ({ segment, status, search, onSegment, onStatus, onSearch, counts, ready }: Props) => <div className="space-y-4 mb-5">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {([
      ["Clientes ativos", counts.customers, "customers", "active"],
      ["Em teste grátis", counts.trials, "trials", "active"],
      ["Testes vencidos", counts.expiredTrials, "trials", "expired"],
      ["Contas bloqueadas", counts.blocked, "all", "blocked"],
    ] as const).map(([label, count, group, state]) => <button key={label} disabled={!ready}
      onClick={() => { onSegment(group); onStatus(state); }}
      className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 disabled:opacity-50">
      <span className="block text-xs text-muted-foreground">{label}</span><span className="text-2xl font-semibold">{ready ? count : "..."}</span>
    </button>)}
  </div>
  <div className="grid gap-3 sm:grid-cols-3">
    <div className="space-y-1.5"><Label htmlFor="directory-search">Buscar conta</Label><Input id="directory-search" value={search} onChange={e => onSearch(e.target.value)} placeholder="Nome ou e-mail" /></div>
    <SearchSelect id="directory-segment" label="Tipo de conta" value={segment} onChange={v => onSegment(v as DirectorySegment)} allowEmpty={false} options={[
      { value: "customers", label: "Clientes" }, { value: "trials", label: "Testes grátis" },
      { value: "internal", label: "Administradores e testers" }, { value: "unclassified", label: "Sem classificação" }, { value: "all", label: "Todas as contas" },
    ]} />
    <SearchSelect id="directory-status" label="Situação do acesso" value={status} onChange={v => onStatus(v as DirectoryStatus)} allowEmpty={false} options={[
      { value: "active", label: "Ativos" }, { value: "expired", label: "Vencidos" }, { value: "blocked", label: "Bloqueados" },
      { value: "pending_confirmation", label: "Aguardando confirmação de e-mail" }, { value: "all", label: "Todas as situações" },
    ]} />
  </div>
</div>;
export default AccountDirectoryFilters;
