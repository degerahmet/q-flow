'use client';

import { AuthGuard } from '@/components/auth/auth-guard';

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <div>
        <h1 className="text-2xl font-bold mb-4">Projects</h1>
        <p className="text-muted-foreground">Your projects will appear here.</p>
      </div>
    </AuthGuard>
  );
}