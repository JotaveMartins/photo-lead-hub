import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
}

/**
 * Search input with magnifying glass icon (left) and a clear "X" button (right)
 * that appears whenever there is text. Used across the app for consistent UX.
 */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, className, containerClassName, placeholder = "Buscar...", ...props }, ref) => {
    return (
      <div className={cn("relative w-full", containerClassName)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={ref}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className={cn("pl-9", value ? "pr-9" : "pr-3", className)}
          {...props}
        />
        {value && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => onValueChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

export { SearchInput };