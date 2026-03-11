'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import WorkspaceSidebar from '@/app/components/WorkspaceSidebar';
import NovaChatArea from '@/app/components/NovaChatArea';
import StatsPanel from '@/app/components/StatsPanel';

function DashboardInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const chatId = searchParams.get('chatId') || undefined;
  const projectId = searchParams.get('projectId') || undefined;

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <WorkspaceSidebar
        activeSessionId={chatId}
        activeProjectId={projectId}
        onSelectSession={(id) => router.push(`/dashboard?chatId=${id}`)}
        onSelectProject={(id) => router.push(`/dashboard?projectId=${id}`)}
        onNewChat={() => router.push('/dashboard')}
      />
      <NovaChatArea
        sessionId={chatId}
        projectId={projectId}
      />
      <StatsPanel />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
