'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import ProjectSelector from './ProjectSelector';
import Nova from './Nova';
import NovaCalibration from './NovaCalibration';

interface Project {
  id: string;
  name: string;
  description: string;
  confidence: number;
  updated_at: string;
}

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  activeProject?: Project | null;
  onProjectSelect?: (project: Project) => void;
}

export default function WorkspaceLayout({ children, activeProject, onProjectSelect }: WorkspaceLayoutProps) {
  const { data: session } = useSession();
  const [novaOpen, setNovaOpen] = useState(false);
  const [novaPreFill, setNovaPreFill] = useState<string | undefined>(undefined);
  const [showCalibration, setShowCalibration] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleAskNova = (prompt: string) => {
    setNovaPreFill(prompt);
    setNovaOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-56 shrink-0 border-r border-white/8 flex flex-col h-screen sticky top-0" style={{ backgroundColor: '#111111' }}>
          <ProjectSelector
            activeProjectId={activeProject?.id}
            onSelect={(p) => onProjectSelect?.(p)}
            onCreateNew={() => {}}
          />
          {/* Bottom nav */}
          <div className="border-t border-white/8 p-3 space-y-1">
            <Link href="/dashboard">
              <div className="px-3 py-2 text-xs text-white/40 hover:text-white/70 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                Dashboard
              </div>
            </Link>
            <Link href="/dashboard/profile">
              <div className="px-3 py-2 text-xs text-white/40 hover:text-white/70 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                Your Profile
              </div>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="w-full text-left px-3 py-2 text-xs text-white/25 hover:text-white/50 rounded-lg hover:bg-white/5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="border-b border-white/8 px-6 py-3 flex items-center justify-between shrink-0" style={{ backgroundColor: '#111111' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/30 hover:text-white/60 transition-colors text-sm">
              {sidebarOpen ? '←' : '→'}
            </button>
            {activeProject ? (
              <div>
                <span className="text-white text-sm font-light">{activeProject.name}</span>
                {activeProject.confidence > 0 && (
                  <span className="text-white/30 text-xs ml-2">{activeProject.confidence}% confidence</span>
                )}
              </div>
            ) : (
              <span className="text-white/40 text-sm">PatternAligned</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeProject && activeProject.confidence < 50 && (
              <button
                onClick={() => setShowCalibration(true)}
                className="text-xs border border-white/20 text-white/50 px-3 py-1.5 rounded-full hover:border-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black transition-all"
              >
                Calibrate project
              </button>
            )}
            <button
              onClick={() => setNovaOpen(!novaOpen)}
              className={`px-4 py-1.5 text-xs rounded-full border transition-all ${
                novaOpen ? 'bg-white text-black border-white' : 'border-white/25 text-white/60 hover:border-white/60'
              }`}
            >
              {novaOpen ? 'Close Nova' : 'Nova'}
            </button>
          </div>
        </div>

        {/* Nova panel */}
        {novaOpen && (
          <div className="border-b border-white/8 shrink-0" style={{ height: '400px', backgroundColor: '#111111' }}>
            <Nova initialMessage={novaPreFill} />
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>

      {/* Calibration modal */}
      {showCalibration && (
        <NovaCalibration
          projectId={activeProject?.id}
          onComplete={() => setShowCalibration(false)}
        />
      )}
    </div>
  );
}
