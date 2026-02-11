'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ReviewHeader, type ReviewFilter } from '@/components/review/review-header';
import { ReviewList, type ReviewListItem } from '@/components/review/review-list';
import {
  ReviewDetail,
  type ReviewDetailItem,
} from '@/components/review/review-detail';
import { getToken } from '@/lib/auth';
import {
  getProjectDetails,
  getReviewQueue,
  getProjectQuestions,
  submitReview,
  type ReviewQuestionRequestBody,
} from '@/lib/api/projects';
import type {
  GetProjectDetailsResponseDto,
  QuestionItemDto,
  ReviewQueueItemDto,
} from '@/lib/api/types/projects';
import { QuestionItemStatus } from '@/lib/api/types/projects';
import { useToast } from '@/hooks/use-toast';

function toListItem(
  item: ReviewQueueItemDto | QuestionItemDto,
): ReviewListItem {
  return {
    id: item.id,
    rowIndex: item.rowIndex,
    questionText: item.questionText,
    confidenceScore: item.confidenceScore ?? undefined,
    status: 'status' in item ? item.status : undefined,
  };
}

function toDetailItem(
  item: ReviewQueueItemDto | QuestionItemDto,
): ReviewDetailItem {
  const citations = 'citations' in item ? item.citations : [];
  return {
    id: item.id,
    rowIndex: item.rowIndex,
    questionText: item.questionText,
    aiAnswer: item.aiAnswer,
    confidenceScore: item.confidenceScore ?? null,
    citations,
  };
}

export default function ReviewPage() {
  const params = useParams();
  const projectId = params?.id as string | undefined;
  const { toast } = useToast();

  const [project, setProject] = useState<GetProjectDetailsResponseDto | null>(
    null,
  );
  const [items, setItems] = useState<(ReviewQueueItemDto | QuestionItemDto)[]>(
    [],
  );
  const [filter, setFilter] = useState<ReviewFilter>('NEEDS_REVIEW');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const token = getToken();
    if (!token) return;
    try {
      const data = await getProjectDetails(token, projectId);
      setProject(data);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load project',
        variant: 'destructive',
      });
    }
  }, [projectId, toast]);

  const loadItems = useCallback(async () => {
    if (!projectId) return;
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      if (filter === 'NEEDS_REVIEW') {
        const res = await getReviewQueue(token, projectId);
        setItems(res.questions ?? []);
      } else if (filter === 'APPROVED') {
        const res = await getProjectQuestions(
          token,
          projectId,
          QuestionItemStatus.APPROVED,
        );
        setItems(res.questions ?? []);
      } else if (filter === 'REJECTED') {
        const res = await getProjectQuestions(
          token,
          projectId,
          QuestionItemStatus.REJECTED,
        );
        setItems(res.questions ?? []);
      } else {
        const res = await getProjectQuestions(token, projectId);
        setItems(res.questions ?? []);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to load questions',
        variant: 'destructive',
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, filter, toast]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (items.length > 0 && (!selectedId || !items.some((i) => i.id === selectedId))) {
      const first = items[0];
      if (first) setSelectedId(first.id);
    } else if (items.length === 0) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const selectedItem =
    selectedId != null
      ? items.find((i) => i.id === selectedId) ?? null
      : null;

  const reviewedCount =
    project != null
      ? (project.counts?.APPROVED ?? 0) + (project.counts?.REJECTED ?? 0)
      : 0;
  const totalCount = project?.totalQuestions ?? 0;
  const needsReviewCount = project?.counts?.NEEDS_REVIEW ?? 0;
  const isQueueEmpty = needsReviewCount === 0;

  const handleSubmitReview = useCallback(
    async (questionId: string, body: ReviewQuestionRequestBody) => {
      const token = getToken();
      if (!token) return;
      setSubmitting(true);
      try {
        await submitReview(token, questionId, body);
        setItems((prev) => prev.filter((i) => i.id !== questionId));
        const idx = items.findIndex((i) => i.id === questionId);
        const nextItem =
          idx >= 0 && idx < items.length - 1
            ? items[idx + 1]
            : idx > 0
              ? items[idx - 1]
              : undefined;
        setSelectedId(nextItem?.id ?? null);
        await loadProject();
      } catch (err) {
        toast({
          title: 'Error',
          description:
            err instanceof Error ? err.message : 'Failed to submit review',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [items, loadProject, toast],
  );

  const handleApprove = useCallback(
    (qId: string) => {
      handleSubmitReview(qId, { action: 'APPROVE' });
    },
    [handleSubmitReview],
  );

  const handleEditApprove = useCallback(
    (qId: string, humanAnswer: string) => {
      handleSubmitReview(qId, { action: 'EDIT_APPROVE', humanAnswer });
    },
    [handleSubmitReview],
  );

  const handleReject = useCallback(
    (qId: string, notes?: string) => {
      handleSubmitReview(qId, { action: 'REJECT', notes });
    },
    [handleSubmitReview],
  );

  if (!projectId) {
    return (
      <AuthGuard>
        <div className="text-muted-foreground">Invalid project.</div>
      </AuthGuard>
    );
  }

  const listItems = items.map(toListItem);
  const showActions = filter === 'NEEDS_REVIEW';

  return (
    <AuthGuard>
      <div className="flex h-full flex-col gap-4">
        <ReviewHeader
          reviewedCount={reviewedCount}
          totalCount={totalCount}
          filter={filter}
          onFilterChange={setFilter}
          isQueueEmpty={isQueueEmpty}
        />

        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : filter === 'NEEDS_REVIEW' && items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border bg-muted/20 p-8">
            <p className="text-lg font-medium">All set</p>
            <p className="text-sm text-muted-foreground">
              No items need review. You can export when ready.
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="min-h-[200px] lg:min-h-0">
              <ReviewList
                items={listItems}
                selectedId={selectedId}
                onSelect={setSelectedId}
                getStatus={(item) => item.status}
              />
            </div>
            <div className="min-h-0 flex-1">
              <ReviewDetail
                item={selectedItem ? toDetailItem(selectedItem) : null}
                showActions={showActions}
                onApprove={handleApprove}
                onEditApprove={handleEditApprove}
                onReject={handleReject}
                isSubmitting={submitting}
              />
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
