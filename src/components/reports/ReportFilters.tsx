import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePickerField from "@/components/DatePickerField";
import { Label } from "@/components/ui/label";
import { ReportProfile } from "@/hooks/useReportData";

export type PeriodOption =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

interface ReportFiltersProps {
  period: PeriodOption;
  onPeriodChange: (v: PeriodOption) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  origem: string;
  onOrigemChange: (v: string) => void;
  origens: string[];
  // admin only
  isAdmin: boolean;
  clienteUserId: string;
  onClienteChange: (v: string) => void;
  profiles: ReportProfile[];
}

const periodLabels: Record<PeriodOption, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last7: "Últimos 7 dias",
  last30: "Últimos 30 dias",
  this_month: "Este mês",
  last_month: "Mês anterior",
  this_year: "Este ano",
  custom: "Intervalo personalizado",
};

export function getDateRange(period: PeriodOption, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (period) {
    case "today":
      return { start: today, end: tomorrow };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: y, end: today };
    }
    case "last7": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: s, end: tomorrow };
    }
    case "last30": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: s, end: tomorrow };
    }
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: tomorrow };
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end: e };
    }
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end: tomorrow };
    case "custom": {
      if (customStart && customEnd) {
        const [sy, sm, sd] = customStart.split("-").map(Number);
        const [ey, em, ed] = customEnd.split("-").map(Number);
        const e = new Date(ey, em - 1, ed);
        e.setDate(e.getDate() + 1);
        return { start: new Date(sy, sm - 1, sd), end: e };
      }
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: tomorrow };
    }
  }
}

const ReportFilters = (props: ReportFiltersProps) => {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6 bg-card border border-border rounded-xl p-4">
      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Período</Label>
        <Select value={props.period} onValueChange={(v) => props.onPeriodChange(v as PeriodOption)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(periodLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {props.period === "custom" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Início</Label>
            <DatePickerField value={props.customStart} onChange={props.onCustomStartChange} className="h-9 w-[150px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Fim</Label>
            <DatePickerField value={props.customEnd} onChange={props.onCustomEndChange} className="h-9 w-[150px]" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <Label className="text-xs text-muted-foreground">Origem</Label>
        <Select value={props.origem || "__all__"} onValueChange={(v) => props.onOrigemChange(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {props.origens.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {props.isAdmin && (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <Select value={props.clienteUserId || "__all__"} onValueChange={(v) => props.onClienteChange(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os clientes</SelectItem>
              {props.profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default ReportFilters;
