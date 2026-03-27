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
        <select
          value={props.period}
          onChange={(e) => props.onPeriodChange(e.target.value as PeriodOption)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {Object.entries(periodLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
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
        <select
          value={props.origem || "__all__"}
          onChange={(e) => props.onOrigemChange(e.target.value === "__all__" ? "" : e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="__all__">Todas</option>
          {props.origens.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      {props.isAdmin && (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <select
            value={props.clienteUserId || "__all__"}
            onChange={(e) => props.onClienteChange(e.target.value === "__all__" ? "" : e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="__all__">Todos os clientes</option>
            {props.profiles.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default ReportFilters;
