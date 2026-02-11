'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface CitationItem {
  embeddingId: string;
  score: number;
  snippet: string;
}

const SNIPPET_PREVIEW_LEN = 120;

export function CitationList({ citations }: { citations: CitationItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = citations.find((c) => c.embeddingId === openId);

  if (!citations.length) {
    return (
      <p className="text-sm text-muted-foreground">No citations for this answer.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Citations</p>
      <ul className="space-y-2">
        {citations.map((c) => {
          const preview =
            c.snippet.length <= SNIPPET_PREVIEW_LEN
              ? c.snippet
              : c.snippet.slice(0, SNIPPET_PREVIEW_LEN) + '…';
          return (
            <li key={c.embeddingId}>
              <button
                type="button"
                onClick={() => setOpenId(c.embeddingId)}
                className={cn(
                  'w-full rounded-md border bg-muted/30 px-3 py-2 text-left text-sm',
                  'hover:bg-muted/60 transition-colors',
                )}
              >
                <span className="text-muted-foreground font-mono text-xs">
                  Score: {(c.score * 100).toFixed(0)}%
                </span>
                <p className="mt-1 text-foreground">{preview}</p>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Citation</DialogTitle>
          </DialogHeader>
          {selected && (
            <ScrollArea className="flex-1 rounded-md border p-3 text-sm">
              <p className="text-muted-foreground text-xs font-mono mb-2">
                Score: {(selected.score * 100).toFixed(0)}%
              </p>
              <p className="whitespace-pre-wrap text-foreground">{selected.snippet}</p>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
