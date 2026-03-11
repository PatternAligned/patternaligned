'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface NovaSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  confidence: number;
}

interface WorkspaceSidebarProps {
  activeSessionId?: string;
  activeProjectId?: string;
  onSelectSession: (id: string) => void;
  onSelectProject: (id: string) => void;
  onNewChat: () => void;
}

export default function WorkspaceSidebar({
  activeSessionId,
  activeProjectId,
  onSelectSession,
  onSelectProject,
  onNewChat,
}: WorkspaceSidebarProps) {
  const [sessions, setSessions] = useState<NovaSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/nova/sessions')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {});

    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, []);

  const filteredSessions = sessions.filter((s) =>
    (s.title || 'Untitled').toLowerCase().includes(search.toLowerCase())
  );

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setNewProjectName('');
        setShowNewProject(false);
      }
    } catch {}
    setCreating(false);
  };

  return (
    <div
      className="flex flex-col w-64 shrink-0 h-screen border-r border-[#333] overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#333]">
        <span className="text-white text-sm font-semibold tracking-wide">PatternAligned</span>
      </div>

      {/* New chat button */}
      <div className="px-3 pt-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 border border-[#333] rounded-lg hover:border-[#c0c0c0]/40 hover:text-white transition-colors"
        >
          <span className="text-[#c0c0c0]">+</span> New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full bg-white/5 border border-[#333] text-white placeholder-white/25 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#c0c0c0]/40"
        />
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Recents */}
        <div>
          <p className="text-white/25 text-xs uppercase tracking-widest mb-2 px-1">Recents</p>
          {filteredSessions.length === 0 ? (
            <p className="text-white/20 text-xs px-1">No recent chats</p>
          ) : (
            <div className="space-y-0.5">
              {filteredSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSessionId === s.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <div className="truncate">{s.title || 'Untitled'}</div>
                  <div className="text-white/25 text-xs mt-0.5">
                    {timeAgo(s.updated_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div>
          <p className="text-white/25 text-xs uppercase tracking-widest mb-2 px-1">Projects</p>
          {filteredProjects.length === 0 ? (
            <p className="text-white/20 text-xs px-1">No projects yet</p>
          ) : (
            <div className="space-y-0.5">
              {filteredProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeProjectId === p.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <div className="truncate">{p.name}</div>
                  <div className="text-white/25 text-xs mt-0.5">{p.confidence ?? 0}% confidence</div>
                </button>
              ))}
            </div>
          )}

          {/* New project */}
          {showNewProject ? (
            <div className="mt-2 space-y-1">
              <input
                autoFocus
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                  if (e.key === 'Escape') setShowNewProject(false);
                }}
                placeholder="Project name..."
                className="w-full bg-white/5 border border-[#333] text-white placeholder-white/25 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#c0c0c0]/40"
              />
              <div className="flex gap-1">
                <button
                  onClick={handleCreateProject}
                  disabled={creating}
                  className="flex-1 text-xs bg-white text-black rounded-lg py-1.5 disabled:opacity-50"
                >
                  {creating ? '...' : 'Create'}
                </button>
                <button
                  onClick={() => setShowNewProject(false)}
                  className="text-xs text-white/30 px-2 py-1.5 hover:text-white/60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewProject(true)}
              className="mt-1 w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <span>+</span> New project
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#333] px-3 py-3 space-y-0.5">
        <Link href="/dashboard/profile">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors cursor-pointer">
            Settings
            <span className="text-white/20 text-xs">→</span>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
