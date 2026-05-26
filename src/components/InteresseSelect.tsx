import { useState, useRef, useEffect } from "react";
import { useInteresseOptions, useCreateInteresseOption, useDeleteInteresseOption, useRenameInteresseOption } from "@/hooks/useInteresseOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, X, Pencil, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteresseSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  manageable?: boolean;
  variant?: "default" | "inline";
}

const InteresseSelect = ({
  value,
  onValueChange,
  placeholder = "Selecione o interesse",
  className,
  manageable = true,
  variant = "default",
}: InteresseSelectProps) => {
  const { data: options = [], isLoading: optionsLoading } = useInteresseOptions();
  const createOption = useCreateInteresseOption();
  const deleteOption = useDeleteInteresseOption();
  const renameOption = useRenameInteresseOption();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [editingOpt, setEditingOpt] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = async () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    await createOption.mutateAsync(trimmed);
    onValueChange(trimmed);
    setNewOption("");
    setAdding(false);
  };

  const handleDelete = async () => {
    if (!value) return;
    await deleteOption.mutateAsync(value);
    onValueChange("");
  };

  const handleStartEdit = () => {
    if (!value) return;
    setEditingOpt(true);
    setEditDraft(value);
  };

  const handleCommitEdit = async () => {
    if (!editingOpt || !value) return;
    const trimmed = editDraft.trim();
    if (trimmed && trimmed !== value) {
      await renameOption.mutateAsync({ oldName: value, newName: trimmed });
      onValueChange(trimmed);
    }
    setEditingOpt(false);
    setEditDraft("");
  };

  // Inline variant keeps native select style for in-place editing
  if (variant === "inline") {
    return (
      <select
        aria-label={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="w-full bg-transparent border-0 p-0 px-1 py-0.5 -mx-1 h-auto text-sm text-foreground cursor-pointer hover:bg-muted/50 rounded focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">{optionsLoading ? "Carregando..." : placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Custom dropdown trigger */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {optionsLoading ? "Carregando..." : (value || placeholder)}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-md">
            <div className="max-h-52 overflow-y-auto py-1">
              {/* Empty/placeholder option */}
              <button
                type="button"
                onClick={() => { onValueChange(""); setOpen(false); }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/60 transition-colors",
                  !value ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                <span>{placeholder}</span>
                {!value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>

              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onValueChange(opt); setOpen(false); }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/60 transition-colors",
                    value === opt ? "text-foreground font-medium bg-muted/40" : "text-foreground"
                  )}
                >
                  <span>{opt}</span>
                  {value === opt && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}

              {options.length === 0 && !optionsLoading && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma opção cadastrada.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Management controls */}
      {manageable && (
        <div className="flex flex-wrap items-center gap-2">
          {!adding ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => setAdding(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar opção
            </Button>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setAdding(false); setNewOption(""); }
                }}
                placeholder="Nova opção..."
                className="h-8 bg-muted border-border"
                autoFocus
              />
              <Button type="button" size="sm" className="h-8" onClick={handleAdd} disabled={!newOption.trim() || createOption.isPending}>
                <Check className="w-4 h-4" />
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => { setAdding(false); setNewOption(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {value && !editingOpt && (
            <>
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={handleStartEdit}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={handleDelete} disabled={deleteOption.isPending}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {editingOpt && (
            <div className="flex items-center gap-2 w-full">
              <Input
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitEdit();
                  if (e.key === "Escape") { setEditingOpt(false); setEditDraft(""); }
                }}
                className="h-8 bg-muted border-border"
                autoFocus
              />
              <Button type="button" size="sm" className="h-8" onClick={handleCommitEdit} disabled={!editDraft.trim() || renameOption.isPending}>
                <Check className="w-4 h-4" />
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => { setEditingOpt(false); setEditDraft(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteresseSelect;
