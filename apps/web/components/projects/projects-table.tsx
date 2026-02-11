'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { ProjectRowActions } from './project-row-actions';
import type { ProjectListItemDto } from '@/lib/api/types/projects';
import { RefreshCw } from 'lucide-react';

export interface ProjectsTableProps {
  items: ProjectListItemDto[];
  loading?: boolean;
  onRefresh?: () => void;
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ProgressCell({ counts }: { counts: ProjectListItemDto['counts'] }) {
  const c = counts ?? {};
  const approved = c.APPROVED ?? 0;
  const drafted = c.DRAFTED ?? 0;
  const needsReview = c.NEEDS_REVIEW ?? 0;
  const pending = c.PENDING ?? 0;
  const total =
    approved + drafted + needsReview + pending + (c.REJECTED ?? 0) + (c.FAILED ?? 0) + (c.EXPORTED ?? 0);
  return (
    <span className="text-muted-foreground text-sm">
      A:{approved} D:{drafted} R:{needsReview} P:{pending} / {total}
    </span>
  );
}

export function ProjectsTable({
  items,
  loading,
  onRefresh,
}: ProjectsTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Loading projects...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p>No projects yet.</p>
        <p className="mt-1 text-sm">Upload a questionnaire above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Projects</h2>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        )}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  {project.originalName || project.id}
                </TableCell>
                <TableCell>{formatDate(project.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={project.status} />
                </TableCell>
                <TableCell>
                  <ProgressCell counts={project.counts} />
                </TableCell>
                <TableCell className="text-right">
                  <ProjectRowActions
                    project={project}
                    onDraftStarted={onRefresh}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
