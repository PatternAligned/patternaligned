'use client';

import { useState } from 'react';

interface SetupIntakeProps {
  onComplete: () => void;
  onBack?: () => void;
}

const SETUP_STORAGE_KEY = 'onboarding_setup';

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
  { id: 'concise_2', label: 'Concise' },
  { id: 'verbose', label: 'Verbose' },
  { id: 'questioning', label: 'Questioning' },
  { id: 'skeptical', label: 'Skeptical' },
  { id: 'encouraging', label: 'Encouraging' },
  { id: 'humble', label: 'Humble' },
  { id: 'witty', label: 'Witty' },
  { id: 'systems_thinking', label: 'Systems-thinking' },
  { id: 'iterative', label: 'Iterative' },
  { id: 'devils_advocate', label: "Devil's advocate" },
  { id: 'vulnerable', label: 'Vulnerable' },
  { id: 'provocative', label: 'Provocative' },
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
                : 'bg-transparent border-white/40 text-white hover:border-white hover:bg-white hover:text-black'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const labelClass = 'block text-xs font-semibold text-white uppercase tracking-widest mb-3';
const inputClass = `
  w-full bg-white/5 border border-white/40 rounded-lg px-4 py-3 text-base text-white
  placeholder-white/40 focus:outline-none focus:border-white focus:bg-white/8
  transition-colors resize-none
`.trim();

function loadSetupState() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem(SETUP_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function saveSetupState(state: { useCases: string[]; goals: string; tones: string[]; novaName: string }) {
  try { sessionStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export default function SetupIntake({ onComplete, onBack }: SetupIntakeProps) {
  const saved = typeof window !== 'undefined' ? loadSetupState() : null;
  const [useCases, setUseCases] = useState<string[]>(saved?.useCases || []);
  const [goals, setGoals] = useState(saved?.goals || '');
  const [tones, setTones] = useState<string[]>(saved?.tones || []);
  const [novaName, setNovaName] = useState(saved?.novaName || 'Nova');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = (patch: Partial<{ useCases: string[]; goals: string; tones: string[]; novaName: string }>) => {
    saveSetupState({ useCases, goals, tones, novaName, ...patch });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const [prefsRes, configRes] = await Promise.all([
        fetch('/api/user/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ use_cases: useCases, goals, tones }),
        }),
        fetch('/api/nova/configuration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nova_name: novaName.trim() || 'Nova' }),
        }),
      ]);
      if (!prefsRes.ok) {
        const data = await prefsRes.json();
        throw new Error(data.error || 'Failed to save preferences');
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
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">PatternAligned</p>
          <h1 className="text-4xl font-light text-white mb-2">How you work</h1>
          <p className="text-white text-sm">Shapes how Nova thinks and talks with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <label className={labelClass}>What do you use this for?</label>
            <MultiSelect options={USE_CASES} selected={useCases} onChange={(v) => { setUseCases(v); persist({ useCases: v }); }} />
            {useCases.length > 0 && (
              <p className="text-white/40 text-xs mt-2">{useCases.length} selected</p>
            )}
          </div>

          <div>
            <label className={labelClass}>What are your goals right now?</label>
            <textarea
              placeholder="Ship the MVP, learn systems design, close a round, fix the hiring pipeline..."
              value={goals}
              onChange={(e) => { setGoals(e.target.value); persist({ goals: e.target.value }); }}
              rows={2}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>How should Nova talk to you?</label>
            <MultiSelect options={TONE_OPTIONS} selected={tones} onChange={(v) => { setTones(v); persist({ tones: v }); }} />
          </div>

          <div>
            <label className={labelClass}>Nova is the default name — would you like to change it?</label>
            <input
              type="text"
              placeholder="Nova"
              value={novaName}
              onChange={(e) => { setNovaName(e.target.value); persist({ novaName: e.target.value }); }}
              className={inputClass.replace('resize-none', '')}
            />
            <p className="text-white text-xs mt-2">She'll answer to whatever you call her.</p>
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
          <div className="w-full bg-white/10 rounded-full h-px mb-3">
            <div className="h-px rounded-full" style={{ width: '50%', backgroundColor: '#c0c0c0' }} />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="text-white text-xs hover:text-white/70 transition-colors"
            >
              ← Back
            </button>
            <p className="text-white text-xs">Step 2 of 4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
