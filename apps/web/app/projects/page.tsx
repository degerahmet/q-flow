'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { UploadQuestionnaireCard } from '@/components/projects/upload-questionnaire-card';
import { ProjectsTable } from '@/components/projects/projects-table';
import { getProjects } from '@/lib/api/projects';
import { getToken } from '@/lib/auth';
import type { ProjectListItemDto } from '@/lib/api/types/projects';

export default function ProjectsPage() {
  const [items, setItems] = useState<ProjectListItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getProjects(token);
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <AuthGuard>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <section>
          <UploadQuestionnaireCard onCreated={fetchProjects} />
        </section>
        <section>
          <ProjectsTable
            items={items}
            loading={loading}
            onRefresh={fetchProjects}
          />
        </section>
      </div>
    </AuthGuard>
  );
}
