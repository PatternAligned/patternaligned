'use client';

import { useState } from 'react';

interface SetupIntakeProps {
  onComplete: () => void;
}

const USE_CASES = [
  { id: 'debugging', label: 'Debugging' },
  { id: 'brainstorming', label: 'Brainstorming' },
  { id: 'shipping', label: 'Shipping fast' },
  { id: 'learning', label: 'Learning' },
  { id: 'writing', label: 'Writing' },
  { id: 'planning', label: 'Planning' },
  { id: 'code_review', label: 'Code review' },
  { id: 'research', label: 'Research' },
  { id: 'hiring', label: 'Hiring' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'system_design', label: 'System design' },
  { id: 'documentation', label: 'Docs' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'product', label: 'Product decisions' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'refactoring', label: 'Refactoring' },
  { id: 'testing', label: 'Testing' },
  { id: 'performance', label: 'Performance' },
  { id: 'security', label: 'Security' },
  { id: 'data', label: 'Data / SQL' },
  { id: 'ops', label: 'DevOps / Infra' },
  { id: 'pitching', label: 'Pitching / decks' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'unblocking', label: 'Getting unstuck' },
];

const TONE_OPTIONS = [
  { id: 'direct', label: 'Direct' },
  { id: 'blunt', label: 'Blunt' },
  { id: 'sarcastic', label: 'Sarcastic' },
  { id: 'analytical', label: 'Analytical' },
  { id: 'warm', label: 'Warm' },
  { id: 'socratic', label: 'Socratic' },
  { id: 'concise', label: 'Ruthlessly concise' },
  { id: 'collaborative', label: 'Collaborative' },
  { id: 'challenging', label: 'Challenging' },
  { id: 'no_fluff', label: 'No corporate speak' },
  { id: 'peer', label: 'Peer, not assistant' },
  { id: 'hype', label: 'Hype me up' },
];

const TOOLS = [
  { id: 'vscode', label: 'VS Code' },
  { id: 'claude_code', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'github', label: 'GitHub' },
  { id: 'slack', label: 'Slack' },
  { id: 'linear', label: 'Linear' },
  { id: 'notion', label: 'Notion' },
  { id: 'figma', label: 'Figma' },
  { id: 'vercel', label: 'Vercel' },
  { id: 'render', label: 'Render' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'docker', label: 'Docker' },
  { id: 'aws', label: 'AWS' },
  { id: 'gcp', label: 'GCP' },
  { id: 'jira', label: 'Jira' },
  { id: 'airtable', label: 'Airtable' },
  { id: 'retool', label: 'Retool' },
  { id: 'postman', label: 'Postman' },
];

function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              active
                ? 'bg-white text-black border-white'
                : 'bg-transparent border-white/20 text-white/60 hover:border-white/50 hover:text-white/90'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const labelClass = 'block text-xs font-semibold text-white/50 uppercase tracking-widest mb-3';
const inputClass = `
  w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-base text-white
  placeholder-white/30 focus:outline-none focus:border-white/50 focus:bg-white/8
  transition-colors resize-none
`.trim();

export default function SetupIntake({ onComplete }: SetupIntakeProps) {
  const [useCases, setUseCases] = useState<string[]>([]);
  const [goals, setGoals] = useState('');
  const [tones, setTones] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_cases: useCases, goals, tones, tools }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 py-12">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-10">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-3">PatternAligned</p>
          <h1 className="text-4xl font-light text-white mb-2">How you work</h1>
          <p className="text-white/40 text-sm">Shapes how Nova thinks and talks with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <label className={labelClass}>What do you use this for?</label>
            <MultiSelect options={USE_CASES} selected={useCases} onChange={setUseCases} />
            {useCases.length > 0 && (
              <p className="text-white/25 text-xs mt-2">{useCases.length} selected</p>
            )}
          </div>

          <div>
            <label className={labelClass}>What are your goals right now?</label>
            <textarea
              placeholder="Ship the MVP, learn systems design, close a round, fix the hiring pipeline..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>How should Nova talk to you?</label>
            <MultiSelect options={TONE_OPTIONS} selected={tones} onChange={setTones} />
          </div>

          <div>
            <label className={labelClass}>Your stack</label>
            <MultiSelect options={TOOLS} selected={tools} onChange={setTools} />
            {tools.length > 0 && (
              <p className="text-white/25 text-xs mt-2">{tools.length} selected</p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving...' : 'Continue →'}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="w-full bg-white/10 rounded-full h-1">
            <div className="bg-white/40 h-1 rounded-full" style={{ width: '50%' }} />
          </div>
          <p className="text-white/20 text-xs mt-2">Step 2 of 4</p>
        </div>
      </div>
    </div>
  );
}
