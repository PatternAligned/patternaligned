'use client';

import { useState } from 'react';

interface ContextIntakeProps {
  onComplete: () => void;
  onBack?: () => void;
}

const inputClass = `
  w-full bg-white/5 border border-white/40 rounded-lg px-4 py-3 text-base text-white
  placeholder-white/40 focus:outline-none focus:border-white focus:bg-white/8
  transition-colors
`.trim();

const labelClass = 'block text-xs font-semibold text-white uppercase tracking-widest mb-2';

const STORAGE_KEY = 'onboarding_context';

export default function ContextIntake({ onComplete, onBack }: ContextIntakeProps) {
  const [form, setForm] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { role: '', description: '', current_work: '', domain: '' };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allFieldsFilled = !!(form.role && form.description && form.current_work && form.domain);

  const updateForm = (patch: Partial<typeof form>) => {
    const updated = { ...form, ...patch };
    setForm(updated);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFieldsFilled) { setError('All fields are required'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="mb-10">
          {/* PatternAligned branding: ONLY P & A capitalized, never full caps — remove uppercase class */}
          <p className="text-white text-xs tracking-widest mb-3">PatternAligned</p>
          <h1 className="text-4xl font-light text-white mb-2">A bit about you</h1>
          <p className="text-white text-sm">Context shapes how the system thinks with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Role or title</label>
            <input
              type="text"
              placeholder="Founder, Engineer, Designer, PM..."
              value={form.role}
              onChange={(e) => updateForm({ role: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>What you do</label>
            <textarea
              placeholder="Brief description of your work"
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>What you're working on right now</label>
            <textarea
              placeholder="Current project, goal, or problem you're tackling"
              value={form.current_work}
              onChange={(e) => updateForm({ current_work: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Domain or industry</label>
            <input
              type="text"
              placeholder="SaaS, Healthcare, Finance, Creative..."
              value={form.domain}
              onChange={(e) => updateForm({ domain: e.target.value })}
              className={inputClass}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || !allFieldsFilled}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving...' : 'Continue →'}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="w-full bg-white/10 rounded-full h-px mb-3">
            <div className="h-px rounded-full" style={{ width: '25%', backgroundColor: '#c0c0c0' }} />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="text-white text-xs hover:text-white/70 transition-colors"
            >
              ← Back
            </button>
            <p className="text-white text-xs">Step 1 of 4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
