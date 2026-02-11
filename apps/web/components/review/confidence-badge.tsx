'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <Badge variant="secondary" className="shrink-0">
        —
      </Badge>
    );
  }

  const value = Math.round(score * 100);
  const variant =
    score >= 0.75 ? 'default' : score >= 0.6 ? 'secondary' : 'destructive';

  const colorClass =
    score >= 0.75
      ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
      : score >= 0.6
        ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400';

  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 font-mono', colorClass)}
    >
      {value}%
    </Badge>
  );
}
