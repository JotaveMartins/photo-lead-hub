import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface MultiSearchSelectOption {
  value: string;
  label: string;
  hint?: string | null;
}

interface MultiSearchSelectProps {
  options: MultiSearchSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  allLabel?: string;
  className?: string;
}

const MultiSearchSelect = ({
  options,
  values,
  onChange,
  label,
  placeholder = "Todos",
  searchPlaceholder = "Buscar...",
  allLabel = "Todos",
  className,
}: MultiSearchSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
    openUp: boolean;
    strategy: "fixed" | "absolute";
  } | null>(null);

  const getPortalTarget = (): HTMLElement | null => {
    if (typeof document === "undefined") return null;
    const el = triggerRef.current?.closest(
      '[role="dialog"], [data-radix-dialog-content], [data-radix-popper-content-wrapper], [data-vaul-drawer], [data-state][data-side]'
    ) as HTMLElement | null;
    return el || document.body;
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const portalTarget = getPortalTarget();
    if (!portalTarget) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const isBodyTarget = portalTarget === document.body;
    const targetRect = isBodyTarget
      ? { top: 0, left: 0, bottom: window.innerHeight }
      : portalTarget.getBoundingClientRect();
    const spaceBelow = targetRect.bottom - rect.bottom;
    const spaceAbove = rect.top - targetRect.top;
    const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    setPos({
      left: isBodyTarget ? rect.left : rect.left - targetRect.left + portalTarget.scrollLeft,
      top: openUp
        ? rect.top - targetRect.top + portalTarget.scrollTop - 4
        : rect.bottom - targetRect.top + portalTarget.scrollTop + 4,
      width: rect.width,
      openUp,
      strategy: isBodyTarget ? "fixed" : "absolute",
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = ref.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
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

  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  };

  const triggerLabel = () => {
    if (values.length === 0) return placeholder;
    if (values.length === 1) {
      return options.find((o) => o.value === values[0])?.label || values[0];
    }
    return `${values.length} selecionados`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div ref={ref} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => { setOpen(!open); setSearch(""); }}
          className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={values.length ? "text-foreground truncate" : "text-muted-foreground truncate"}>
            {triggerLabel()}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
        </button>

        {open && pos && createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: pos.strategy,
              left: pos.left,
              top: pos.top,
              width: pos.width,
              zIndex: 9999,
              pointerEvents: "auto",
              transform: pos.openUp ? "translateY(calc(-100% - 4px))" : undefined,
            }}
            className="rounded-md border border-border bg-card shadow-md"
          >
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
              <button
                type="button"
                onClick={() => onChange([])}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/60 transition-colors",
                  values.length === 0 ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                <span>{allLabel}</span>
                {values.length === 0 && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              {filtered.map((o) => {
                const checked = values.includes(o.value);
                return (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/60 transition-colors",
                      checked ? "text-foreground font-medium bg-muted/40" : "text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border border-border shrink-0",
                          checked && "bg-primary border-primary"
                        )}
                      >
                        {checked && <Check className="w-3 h-3 text-primary-foreground" />}
                      </span>
                      {o.label}
                    </span>
                    {o.hint && <span className="text-xs text-muted-foreground shrink-0">{o.hint}</span>}
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>
              )}
            </div>
          </div>,
          getPortalTarget() ?? document.body
        )}
      </div>
    </div>
  );
};

export default MultiSearchSelect;
