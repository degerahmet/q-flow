'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ConfidenceBadge } from '@/components/review/confidence-badge';
import { CitationList, type CitationItem } from '@/components/review/citation-list';
import { ReviewActions } from './review-actions';

export interface ReviewDetailItem {
  id: string;
  rowIndex: number;
  questionText: string;
  aiAnswer: string | null;
  confidenceScore: number | null;
  citations?: CitationItem[];
}

export interface ReviewDetailProps {
  item: ReviewDetailItem | null;
  /** Show Approve / Edit & Approve / Reject (only for NEEDS_REVIEW) */
  showActions: boolean;
  onApprove: (questionId: string) => void;
  onEditApprove: (questionId: string, humanAnswer: string) => void;
  onReject: (questionId: string, notes?: string) => void;
  isSubmitting: boolean;
}

export function ReviewDetail({
  item,
  showActions,
  onApprove,
  onEditApprove,
  onReject,
  isSubmitting,
}: ReviewDetailProps) {
  if (!item) {
    return (
      <Card className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
          Select an item from the list.
        </CardContent>
      </Card>
    );
  }

  const citations = item.citations ?? [];

  return (
    <Card className="flex flex-1 flex-col overflow-hidden">
      <CardHeader className="space-y-2 border-b">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            #{item.rowIndex}
          </span>
          <ConfidenceBadge score={item.confidenceScore} />
        </div>
        <h3 className="text-base font-medium leading-snug">{item.questionText}</h3>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-auto p-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">AI answer</p>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap">
            {item.aiAnswer ?? '—'}
          </div>
        </div>

        <CitationList citations={citations} />

        {showActions && (
          <ReviewActions
            questionId={item.id}
            aiAnswer={item.aiAnswer}
            onApprove={() => onApprove(item.id)}
            onEditApprove={(humanAnswer: string) => onEditApprove(item.id, humanAnswer)}
            onReject={(notes?: string) => onReject(item.id, notes)}
            isSubmitting={isSubmitting}
          />
        )}
      </CardContent>
    </Card>
  );
}
