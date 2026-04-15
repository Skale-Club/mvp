import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  actionsClassName?: string;
  titleTestId?: string;
}

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  actionsClassName,
  titleTestId,
}: AdminPageHeaderProps) {
  return (
    <header className={cn('border-b border-border pb-5', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold text-foreground" data-testid={titleTestId}>
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className={cn('flex flex-wrap items-center gap-2 md:justify-end', actionsClassName)}>
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
