'use client';

import { useState } from 'react';

interface ContextIntakeProps {
  onComplete: () => void;
}

const inputClass = `
  w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-base text-white
  placeholder-white/30 focus:outline-none focus:border-white/50 focus:bg-white/8
  transition-colors
`.trim();

const labelClass = 'block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2';

export default function ContextIntake({ onComplete }: ContextIntakeProps) {
  const [form, setForm] = useState({ role: '', description: '', current_work: '', domain: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <p className="text-white/30 text-xs uppercase tracking-widest mb-3">PatternAligned</p>
          <h1 className="text-4xl font-light text-white mb-2">A bit about you</h1>
          <p className="text-white/40 text-sm">Context shapes how the system thinks with you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Role or title</label>
            <input
              type="text"
              placeholder="Founder, Engineer, Designer, PM..."
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>What you do</label>
            <textarea
              placeholder="Brief description of your work"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>What you're working on right now</label>
            <textarea
              placeholder="Current project, goal, or problem you're tackling"
              value={form.current_work}
              onChange={(e) => setForm({ ...form, current_work: e.target.value })}
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
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className={inputClass}
            />
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
            <div className="bg-white/40 h-1 rounded-full" style={{ width: '25%' }} />
          </div>
          <p className="text-white/20 text-xs mt-2">Step 1 of 4</p>
        </div>
      </div>
    </div>
  );
}
