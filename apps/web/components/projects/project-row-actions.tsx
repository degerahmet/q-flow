'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { startDraft } from '@/lib/api/projects';
import { getToken } from '@/lib/auth';
import type { ProjectListItemDto } from '@/lib/api/types/projects';
import { FileEdit, FileText, Loader2, Download } from 'lucide-react';

export interface ProjectRowActionsProps {
  project: ProjectListItemDto;
  onDraftStarted?: () => void;
}

export function ProjectRowActions({
  project,
  onDraftStarted,
}: ProjectRowActionsProps) {
  const [drafting, setDrafting] = useState(false);
  const counts = project.counts ?? {};
  const pending = counts.PENDING ?? 0;
  const needsReview = counts.NEEDS_REVIEW ?? 0;
  const canStartDraft =
    pending > 0 &&
    (project.status === 'PROCESSING' || project.status === 'QUEUED');
  const canReview = needsReview > 0;
  const canExport = needsReview === 0;

  const handleStartDraft = async () => {
    const token = getToken();
    if (!token || !canStartDraft) return;
    setDrafting(true);
    try {
      await startDraft(token, project.id);
      onDraftStarted?.();
    } finally {
      setDrafting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {canStartDraft && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartDraft}
                disabled={drafting}
              >
                {drafting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileEdit className="mr-1 h-4 w-4" />
                    Start Draft
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate draft answers for pending questions</TooltipContent>
          </Tooltip>
        )}
        {canReview && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}/review`}>
              <FileText className="mr-1 h-4 w-4" />
              Review
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${project.id}`}>View</Link>
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canExport}
                aria-label="Export (complete review first)"
              >
                <Download className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {canExport
              ? 'Export (not implemented yet)'
              : 'Complete review before export'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
