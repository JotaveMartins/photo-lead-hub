import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Ação principal (Button default). Fica à direita. */
  action?: React.ReactNode;
  /** Ações secundárias (outline/ghost). Ficam antes da principal. */
  secondaryActions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, secondaryActions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {(action || secondaryActions) && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {secondaryActions}
          {action}
        </div>
      )}
    </div>
  );
}
