'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectStatusValue } from '@/lib/api/types/projects';

const statusConfig: Record<
  ProjectStatusValue,
  { label: string; className: string }
> = {
  QUEUED: {
    label: 'Queued',
    className: 'border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-400',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
  },
  FAILED: {
    label: 'Failed',
    className: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as ProjectStatusValue] ?? {
    label: status,
    className: 'border-muted text-muted-foreground',
  };

  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 font-medium', config.className)}
    >
      {config.label}
    </Badge>
  );
}
