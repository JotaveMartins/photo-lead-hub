import { useState, useRef, useEffect } from "react";
import { useInteresseOptions, useCreateInteresseOption, useDeleteInteresseOption, useRenameInteresseOption } from "@/hooks/useInteresseOptions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Plus, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteresseSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
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
  const renameOption = useRenameInteresseOption();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [editingOpt, setEditingOpt] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (editingOpt) editRef.current?.focus();
  }, [editingOpt]);

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

  const handleStartEdit = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    setEditingOpt(opt);
    setEditDraft(opt);
  };

  const handleCommitEdit = async () => {
    if (!editingOpt) return;
    const trimmed = editDraft.trim();
    if (trimmed && trimmed !== editingOpt) {
      await renameOption.mutateAsync({ oldName: editingOpt, newName: trimmed });
      if (value === editingOpt) onValueChange(trimmed);
    }
    setEditingOpt(null);
    setEditDraft("");
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
            <div key={opt}>
              {editingOpt === opt ? (
                <div className="flex items-center gap-1 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <Input
                    ref={editRef}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCommitEdit();
                      if (e.key === "Escape") { setEditingOpt(null); setEditDraft(""); }
                    }}
                    onBlur={handleCommitEdit}
                    className="h-7 text-sm bg-muted border-border flex-1"
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors group"
                  onClick={() => handleSelect(opt)}
                >
                  <Check className={cn("w-4 h-4 shrink-0", value === opt ? "opacity-100 text-primary" : "opacity-0")} />
                  <span className="flex-1 truncate">{opt}</span>
                  {manageable && (
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil
                        className="w-3 h-3 text-muted-foreground hover:text-primary cursor-pointer"
                        onClick={(e) => handleStartEdit(e, opt)}
                      />
                      <X
                        className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={(e) => handleDelete(e, opt)}
                      />
                    </div>
                  )}
                </div>
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
