import { useState, useMemo, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";

interface ClienteSearchSelectProps {
  clientes: { id: string; nome: string; whatsapp: string | null }[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

const ClienteSearchSelect = ({
  clientes,
  value,
  onChange,
  label = "Cliente",
  placeholder = "Buscar cliente...",
  allowEmpty = true,
  emptyLabel = "Sem cliente vinculado",
}: ClienteSearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clientes;
    const s = search.toLowerCase();
    return clientes.filter(
      (c) => c.nome.toLowerCase().includes(s) || (c.whatsapp && c.whatsapp.includes(s))
    );
  }, [clientes, search]);

  const selected = clientes.find((c) => c.id === value);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected ? (
              <>
                {selected.nome}
                {selected.whatsapp && <span className="ml-2 text-muted-foreground">• {selected.whatsapp}</span>}
              </>
            ) : emptyLabel}
          </span>
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
            <div className="p-2">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-input bg-muted px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {allowEmpty && (
                <button
                  type="button"
                  onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${!value ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  {emptyLabel}
                </button>
              )}
              {filtered.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between ${value === c.id ? "text-primary font-medium" : "text-foreground"}`}
                >
                  <span>{c.nome}</span>
                  {c.whatsapp && <span className="text-xs text-muted-foreground">{c.whatsapp}</span>}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClienteSearchSelect;
