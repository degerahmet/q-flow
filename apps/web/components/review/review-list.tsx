'use client';

import { useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface ReviewListItem {
  id: string;
  rowIndex: number;
  questionText: string;
  confidenceScore?: number | null;
  status?: string;
}

const PREVIEW_LEN = 60;

function preview(text: string): string {
  if (text.length <= PREVIEW_LEN) return text;
  return text.slice(0, PREVIEW_LEN).trim() + '…';
}

export interface ReviewListProps {
  items: ReviewListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** When filter is not NEEDS_REVIEW, we may have status per item */
  getStatus?: (item: ReviewListItem) => string | undefined;
}

export function ReviewList({
  items,
  selectedId,
  onSelect,
  getStatus,
}: ReviewListProps) {
  useEffect(() => {
    if (items.length > 0 && (!selectedId || !items.some((i) => i.id === selectedId))) {
      const first = items[0];
      if (first) onSelect(first.id);
    }
  }, [items, selectedId, onSelect]);

  if (items.length === 0) {
    return (
      <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
        No items to show.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">#</TableHead>
            <TableHead>Question</TableHead>
            {getStatus && <TableHead className="w-24">Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              data-state={selectedId === item.id ? 'selected' : undefined}
              className="cursor-pointer"
              onClick={() => onSelect(item.id)}
            >
              <TableCell className="font-mono text-muted-foreground">
                {item.rowIndex}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm">
                {preview(item.questionText)}
              </TableCell>
              {getStatus && (
                <TableCell className="text-xs text-muted-foreground">
                  {getStatus(item) ?? '—'}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
