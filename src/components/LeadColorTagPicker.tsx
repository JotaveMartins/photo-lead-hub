import { Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TAG_COLORS, tagColorClass, tagColorLabel, useLeadAdminTags } from "@/hooks/useLeadAdminTags";

interface Props {
  leadId: string;
  /** Tamanho compacto para uso dentro do card do funil */
  compact?: boolean;
}

/** Seletor de etiqueta de cor (somente administrador). */
const LeadColorTagPicker = ({ leadId, compact }: Props) => {
  const { isAdmin, tags, setTag } = useLeadAdminTags();
  if (!isAdmin) return null;

  const current = tags[leadId] ?? null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={current ? `Etiqueta: ${tagColorLabel(current)}` : "Marcar com uma cor"}
          onClick={(e) => e.stopPropagation()}
          className={compact ? "h-5 w-5" : "h-8 w-8"}
        >
          {current ? (
            <span className={`rounded-full ${tagColorClass(current)} ${compact ? "w-3 h-3" : "w-4 h-4"}`} />
          ) : (
            <Tag className={`text-muted-foreground ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2 bg-popover border-border"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {TAG_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setTag.mutate({ leadId, color: c.value })}
              className={`w-6 h-6 rounded-full ${c.className} transition-transform hover:scale-110 ${
                current === c.value ? "ring-2 ring-offset-2 ring-offset-popover ring-foreground" : ""
              }`}
            />
          ))}
        </div>
        {current && (
          <button
            type="button"
            onClick={() => setTag.mutate({ leadId, color: null })}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Remover etiqueta
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default LeadColorTagPicker;
