'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ReviewFilter = 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL';

const FILTER_LABELS: Record<ReviewFilter, string> = {
  NEEDS_REVIEW: 'Needs Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ALL: 'All',
};

export interface ReviewHeaderProps {
  reviewedCount: number;
  totalCount: number;
  filter: ReviewFilter;
  onFilterChange: (filter: ReviewFilter) => void;
  isQueueEmpty: boolean;
}

export function ReviewHeader({
  reviewedCount,
  totalCount,
  filter,
  onFilterChange,
  isQueueEmpty,
}: ReviewHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">
          Progress: <span className="text-foreground">{reviewedCount}</span> / {totalCount} reviewed
        </span>
        <div className="flex gap-1 rounded-md border p-0.5">
          {(Object.keys(FILTER_LABELS) as ReviewFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>
      <Button disabled={!isQueueEmpty} variant="secondary" size="sm">
        Export
      </Button>
    </div>
  );
}
