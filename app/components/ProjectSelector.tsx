'use client';

import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  confidence: number;
  updated_at: string;
}

interface ProjectSelectorProps {
  activeProjectId?: string;
  onSelect: (project: Project) => void;
  onCreateNew: () => void;
}

export default function ProjectSelector({ activeProjectId, onSelect, onCreateNew }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createProject = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects((p) => [data.project, ...p]);
        setCreating(false);
        setNewName('');
        setNewDesc('');
        onSelect(data.project);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/8">
        <p className="text-white/25 text-xs uppercase tracking-widest mb-1">PatternAligned</p>
        <p className="text-white text-sm font-light">Workspace</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 py-6 text-white/25 text-xs">Loading...</div>
        ) : projects.length === 0 && !creating ? (
          <div className="px-4 py-6 text-center">
            <p className="text-white/25 text-xs mb-4">No projects yet</p>
          </div>
        ) : (
          <div className="space-y-px">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  activeProjectId === p.id
                    ? 'bg-white/8 border-r-2 border-white/40'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className={`text-sm truncate ${activeProjectId === p.id ? 'text-white' : 'text-white/60'}`}>
                    {p.name}
                  </p>
                  <span className="text-white/25 text-xs ml-2 shrink-0">{p.confidence}%</span>
                </div>
                {p.description && (
                  <p className="text-white/30 text-xs truncate">{p.description}</p>
                )}
              </button>
            ))}
          </div>
        )}

        {creating && (
          <div className="px-4 py-3 border-t border-white/8">
            <input
              autoFocus
              type="text"
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 mb-2 focus:outline-none"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #c0c0c0', color: '#e0e0e0' }}
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 mb-3 focus:outline-none"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #c0c0c0', color: '#e0e0e0' }}
            />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 text-xs text-white/30 py-2 border border-white/10 rounded-lg hover:border-white/25 transition-colors">
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newName.trim() || saving}
                className="flex-1 text-xs bg-white text-black font-semibold py-2 rounded-lg disabled:opacity-40 hover:bg-white/90 transition-colors"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/8 p-4">
        <button
          onClick={() => setCreating(true)}
          className="w-full text-xs text-white/40 border border-white/15 py-2.5 rounded-lg hover:border-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black transition-all"
        >
          + New project
        </button>
      </div>
    </div>
  );
}
