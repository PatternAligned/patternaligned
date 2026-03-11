'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import WorkspaceLayout from '@/app/components/WorkspaceLayout';
import NovaCalibration from '@/app/components/NovaCalibration';

interface Project {
  id: string;
  name: string;
  description: string;
  confidence: number;
  updated_at: string;
}

export default function ProjectWorkspace() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationDismissed, setCalibrationDismissed] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (!projectId || status !== 'authenticated') return;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setMemory(d.memory);
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [projectId, status]);

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin" /></div>;
  }
  if (!session || !project) return null;

  const needsCalibration = project.confidence < 50 && !calibrationDismissed;

  if (showCalibration) {
    return (
      <NovaCalibration
        projectId={projectId}
        onComplete={(newConf) => {
          setShowCalibration(false);
          if (newConf) setProject((p) => p ? { ...p, confidence: newConf } : p);
        }}
      />
    );
  }

  return (
    <WorkspaceLayout
      activeProject={project}
      onProjectSelect={(p) => router.push(`/dashboard/workspace/${p.id}`)}
    >
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Project header */}
        <div className="mb-10">
          <h1 className="text-3xl font-light text-white mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-white/40 text-sm">{project.description}</p>
          )}
        </div>

        {/* Low confidence prompt */}
        {needsCalibration && (
          <div className="border border-white/10 rounded-xl p-5 mb-8 bg-white/[0.02]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white/60 text-sm mb-1">Nova has limited context on this project ({project.confidence}% confidence).</p>
                <p className="text-white/30 text-xs">Run a quick calibration to improve Nova's understanding.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setCalibrationDismissed(true)}
                  className="text-xs text-white/25 px-3 py-1.5 border border-white/10 rounded-lg hover:border-white/25 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => setShowCalibration(true)}
                  className="text-xs bg-white text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors"
                >
                  Calibrate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Memory snapshot */}
        {memory?.memory_snapshot && Object.keys(memory.memory_snapshot).length > 0 && (
          <div className="border border-white/8 rounded-xl p-5 mb-8 bg-white/[0.015]">
            <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Last calibration</p>
            <p className="text-white/50 text-sm">
              {memory.memory_snapshot.last_message}
            </p>
            <p className="text-white/25 text-xs mt-2">
              {memory.last_calibrated ? new Date(memory.last_calibrated).toLocaleDateString() : 'Not yet calibrated'}
              {memory.memory_snapshot.accuracy_rating ? ` · ${memory.memory_snapshot.accuracy_rating}% user-rated accuracy` : ''}
            </p>
          </div>
        )}

        {/* Project stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Confidence" value={`${project.confidence}%`} />
          <StatCard label="Calibrations" value={String(memory?.memory_snapshot?.turn_count || 0)} />
          <StatCard label="Last updated" value={new Date(project.updated_at).toLocaleDateString()} />
        </div>

        {/* Call to action */}
        <div className="border border-white/8 rounded-xl p-6 bg-white/[0.015] text-center">
          <p className="text-white/40 text-sm mb-4">Open Nova to work on this project.</p>
          <p className="text-white/20 text-xs">Nova is pre-loaded with your behavioral profile and this project's context.</p>
        </div>

      </div>
    </WorkspaceLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/8 rounded-xl p-4 bg-white/[0.015]">
      <p className="text-white/30 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className="text-white text-xl font-light tabular-nums">{value}</p>
    </div>
  );
}
