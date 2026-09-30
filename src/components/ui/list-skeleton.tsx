import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Loading aproximado para listas/tabelas. */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-6 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Loading aproximado para colunas (kanban). */
export function ColumnsSkeleton({ columns = 3, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("flex gap-4 overflow-hidden", className)} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="w-full min-w-[240px] space-y-3 rounded-lg border border-border p-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ))}
    </div>
  );
}
