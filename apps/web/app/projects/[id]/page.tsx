'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getToken } from '@/lib/auth';
import { getProjectDetails } from '@/lib/api/projects';
import type { GetProjectDetailsResponseDto } from '@/lib/api/types/projects';
import { FileText } from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.id as string | undefined;
  const [project, setProject] = useState<GetProjectDetailsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    getProjectDetails(token, projectId)
      .then((data) => {
        if (!cancelled) setProject(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load project');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!projectId) {
    return (
      <AuthGuard>
        <div className="text-muted-foreground">Invalid project.</div>
      </AuthGuard>
    );
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="text-muted-foreground">Loading project...</div>
      </AuthGuard>
    );
  }

  if (error || !project) {
    return (
      <AuthGuard>
        <div className="text-destructive">{error ?? 'Project not found.'}</div>
      </AuthGuard>
    );
  }

  const { id, status, counts, totalQuestions } = project;
  const needsReview = counts?.NEEDS_REVIEW ?? 0;

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Project</h1>
          <Button asChild>
            <Link href={`/projects/${id}/review`}>
              <FileText className="mr-2 h-4 w-4" />
              Review
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <span className="text-sm text-muted-foreground font-mono">{id}</span>
            <span className="text-sm font-medium capitalize">{status?.toLowerCase()}</span>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Total questions: <span className="font-medium text-foreground">{totalQuestions}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Needs review: <span className="font-medium text-foreground">{needsReview}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Approved: <span className="font-medium text-foreground">{counts?.APPROVED ?? 0}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Rejected: <span className="font-medium text-foreground">{counts?.REJECTED ?? 0}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
