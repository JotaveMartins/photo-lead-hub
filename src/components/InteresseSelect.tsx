import { useState } from "react";
import { useInteresseOptions, useCreateInteresseOption, useDeleteInteresseOption, useRenameInteresseOption } from "@/hooks/useInteresseOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, X, Pencil } from "lucide-react";
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
}: InteresseSelectProps) => {
  const { data: options = [], isLoading: optionsLoading } = useInteresseOptions();
  const createOption = useCreateInteresseOption();
  const deleteOption = useDeleteInteresseOption();
  const renameOption = useRenameInteresseOption();
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [editingOpt, setEditingOpt] = useState(false);
  const [editDraft, setEditDraft] = useState("");

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

  return (
    <div className={cn("space-y-2", className)}>
      <select
        aria-label={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="">{optionsLoading ? "Carregando..." : placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

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
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewOption("");
                  }
                }}
                placeholder="Nova opção..."
                className="h-8 bg-muted border-border"
              />
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={handleAdd}
                disabled={!newOption.trim() || createOption.isPending}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  setAdding(false);
                  setNewOption("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {value && !editingOpt && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={handleStartEdit}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={handleDelete}
                disabled={deleteOption.isPending}
              >
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
                  if (e.key === "Escape") {
                    setEditingOpt(false);
                    setEditDraft("");
                  }
                }}
                className="h-8 bg-muted border-border"
              />
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={handleCommitEdit}
                disabled={!editDraft.trim() || renameOption.isPending}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  setEditingOpt(false);
                  setEditDraft("");
                }}
              >
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
