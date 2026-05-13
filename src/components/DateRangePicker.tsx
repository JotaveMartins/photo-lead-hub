import { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker, type DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (s: string) => format(fromISO(s), "dd/MM/yy");

export function DateRangePicker({ from, to, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const today = new Date();

  const presets: { label: string; range: () => [Date, Date] }[] = [
    { label: "Hoje", range: () => [today, today] },
    { label: "Ontem", range: () => [subDays(today, 1), subDays(today, 1)] },
    { label: "Essa semana", range: () => [startOfWeek(today, { weekStartsOn: 0 }), endOfWeek(today, { weekStartsOn: 0 })] },
    { label: "Semana passada", range: () => { const d = subDays(today, 7); return [startOfWeek(d, { weekStartsOn: 0 }), endOfWeek(d, { weekStartsOn: 0 })]; } },
    { label: "Últimos 3 dias", range: () => [subDays(today, 2), today] },
    { label: "Últimos 7 dias", range: () => [subDays(today, 6), today] },
    { label: "Últimos 30 dias", range: () => [subDays(today, 29), today] },
    { label: "Este mês", range: () => [startOfMonth(today), endOfMonth(today)] },
    { label: "Mês passado", range: () => { const d = subMonths(today, 1); return [startOfMonth(d), endOfMonth(d)]; } },
    { label: "Este ano", range: () => [startOfYear(today), endOfYear(today)] },
    { label: "Ano passado", range: () => { const d = subYears(today, 1); return [startOfYear(d), endOfYear(d)]; } },
    { label: "Máximo", range: () => [new Date(2020, 0, 1), today] },
  ];

  const selected: DateRange = { from: fromISO(from), to: fromISO(to) };
  const [month, setMonth] = useState<Date>(subMonths(today, 1));

  const apply = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange(toISO(range.from), toISO(range.to));
    } else if (range?.from) {
      onChange(toISO(range.from), toISO(range.from));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 justify-start font-normal">
          <CalendarIcon className="w-4 h-4 mr-2" />
          {fmt(from)} — {fmt(to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-auto bg-popover border border-border" sideOffset={4}>
        <div className="flex">
          <div className="flex flex-col py-3 px-2 border-r border-border min-w-[160px] bg-card">
            <div className="text-xs font-semibold uppercase text-muted-foreground px-2 mb-2">Período</div>
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const [f, t] = p.range();
                  onChange(toISO(f), toISO(t));
                  setMonth(f);
                }}
                className="text-left text-sm px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <DayPicker
              mode="range"
              numberOfMonths={2}
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={apply}
              locale={ptBR}
              showOutsideDays
              className="pointer-events-auto"
              classNames={{
                months: "flex space-x-4",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium capitalize",
                nav: "space-x-1 flex items-center",
                nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-muted-foreground w-9 font-normal text-[0.75rem]",
                row: "flex w-full mt-1",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent/30 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary",
                day_today: "text-primary font-semibold",
                day_outside: "text-muted-foreground opacity-40",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent/40 aria-selected:text-foreground rounded-none",
                day_range_start: "rounded-l-md",
                day_range_end: "rounded-r-md",
                day_hidden: "invisible",
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}