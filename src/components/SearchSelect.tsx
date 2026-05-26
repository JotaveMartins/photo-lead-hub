import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  value: string;
  label: string;
  hint?: string | null;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

const SearchSelect = ({
  options,
  value,
  onChange,
  label,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  allowEmpty = true,
  emptyLabel = "Nenhum",
}: SearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const s = search.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(s) || (o.hint && o.hint.toLowerCase().includes(s))
    );
  }, [options, search]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn("space-y-2")}>
      {label && <Label>{label}</Label>}
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => { setOpen(!open); setSearch(""); }}
          className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-md">
            {/* Search input */}
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="max-h-52 overflow-y-auto py-1">
              {/* Empty / none option */}
              {allowEmpty && (
                <button
                  type="button"
                  onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/60 transition-colors",
                    !value ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  <span>{emptyLabel}</span>
                  {!value && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              )}

              {filtered.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/60 transition-colors",
                    value === o.value ? "text-foreground font-medium bg-muted/40" : "text-foreground"
                  )}
                >
                  <span>{o.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
                    {value === o.value && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              ))}

              {filtered.length === 0 && !allowEmpty && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>
              )}
              {filtered.length === 0 && allowEmpty && search.trim() && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchSelect;
