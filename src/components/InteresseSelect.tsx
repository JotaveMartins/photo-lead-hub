import { useState, useRef, useEffect } from "react";
import { useInteresseOptions, useCreateInteresseOption, useDeleteInteresseOption } from "@/hooks/useInteresseOptions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteresseSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** If true, shows manage (add/delete) controls */
  manageable?: boolean;
}

const InteresseSelect = ({
  value,
  onValueChange,
  placeholder = "Selecione o interesse",
  className,
  manageable = true,
}: InteresseSelectProps) => {
  const { data: options = [] } = useInteresseOptions();
  const createOption = useCreateInteresseOption();
  const deleteOption = useDeleteInteresseOption();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (opt: string) => {
    onValueChange(opt);
    setOpen(false);
    setSearch("");
  };

  const handleAdd = async () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    await createOption.mutateAsync(trimmed);
    onValueChange(trimmed);
    setNewOption("");
    setAdding(false);
    setOpen(false);
    setSearch("");
  };

  const handleDelete = async (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    await deleteOption.mutateAsync(opt);
    if (value === opt) onValueChange("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal bg-muted border-border h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 bg-muted border-border"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filtered.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground px-3 py-2">Nenhuma opção encontrada</p>
          )}
          {filtered.map((opt) => (
            <div
              key={opt}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSelect(opt)}
            >
              <Check className={cn("w-4 h-4 shrink-0", value === opt ? "opacity-100 text-primary" : "opacity-0")} />
              <span className="flex-1 truncate">{opt}</span>
              {manageable && (
                <X
                  className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100"
                  style={{ opacity: undefined }}
                  onClick={(e) => handleDelete(e, opt)}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.3"; }}
                />
              )}
            </div>
          ))}
        </div>
        {manageable && (
          <div className="border-t border-border p-2">
            {adding ? (
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") { setAdding(false); setNewOption(""); }
                  }}
                  placeholder="Nova opção..."
                  className="h-8 bg-muted border-border flex-1"
                />
                <Button size="sm" className="h-8 bg-gradient-primary hover:opacity-90" onClick={handleAdd} disabled={!newOption.trim()}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={() => setAdding(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar opção
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default InteresseSelect;
