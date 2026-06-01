import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
    openUp: boolean;
    strategy: "fixed" | "absolute";
  } | null>(null);

  // Find the nearest scroll-locking container (Radix Dialog/Sheet/Drawer content) so
  // react-remove-scroll allows wheel events on our dropdown. Falls back to body.
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
    const dropdownHeight = 320; // approx max height (search + list)
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
      if (
        ref.current && !ref.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      } else if (ref.current && !ref.current.contains(target) && !dropdownRef.current) {
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
          ref={triggerRef}
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
          </div>,
          getPortalTarget() ?? document.body
        )}
      </div>
    </div>
  );
};

export default SearchSelect;
