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
  { id: 'reviewing', label: 'Code review' },
  { id: 'research', label: 'Research' },
];

const TONE_OPTIONS = [
  { id: 'direct', label: 'Direct' },
  { id: 'sarcastic', label: 'Sarcastic' },
  { id: 'analytical', label: 'Analytical' },
  { id: 'warm', label: 'Warm' },
  { id: 'socratic', label: 'Socratic' },
  { id: 'concise', label: 'Ruthlessly concise' },
  { id: 'collaborative', label: 'Collaborative' },
  { id: 'challenging', label: 'Challenging' },
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
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              active
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

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
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">How you work</h1>
          <p className="text-gray-500">Shapes how the system behaves with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              What do you use me for?
            </label>
            <MultiSelect options={USE_CASES} selected={useCases} onChange={setUseCases} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              What are your goals right now?
            </label>
            <textarea
              placeholder="Ship faster, learn a new stack, get unstuck on a product..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              What's your ideal working relationship?
            </label>
            <MultiSelect options={TONE_OPTIONS} selected={tones} onChange={setTones} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tools you use?
            </label>
            <MultiSelect options={TOOLS} selected={tools} onChange={setTools} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
