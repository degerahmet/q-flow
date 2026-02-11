'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, Pencil, X } from 'lucide-react';

export interface ReviewActionsProps {
  questionId: string;
  aiAnswer: string | null;
  onApprove: () => void;
  onEditApprove: (humanAnswer: string) => void;
  onReject: (notes?: string) => void;
  isSubmitting: boolean;
}

export function ReviewActions({
  aiAnswer,
  onApprove,
  onEditApprove,
  onReject,
  isSubmitting,
}: ReviewActionsProps) {
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState(aiAnswer ?? '');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleStartEdit = () => {
    setEditValue(aiAnswer ?? '');
    setEditMode(true);
  };

  const handleSubmitEdit = (): void => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onEditApprove(trimmed);
      setEditMode(false);
    }
  };

  const handleRejectSubmit = (): void => {
    onReject(rejectNotes.trim() || undefined);
    setShowRejectInput(false);
    setRejectNotes('');
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">Actions</p>

      {!editMode && !showRejectInput && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleStartEdit}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit & Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectInput(true)}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      )}

      {editMode && (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Enter your answer..."
            className="min-h-[100px]"
            disabled={isSubmitting}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmitEdit} disabled={isSubmitting}>
              Submit & Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditMode(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showRejectInput && (
        <div className="space-y-2">
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Optional notes for rejection..."
            className="min-h-[60px]"
            disabled={isSubmitting}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={isSubmitting}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowRejectInput(false);
                setRejectNotes('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
