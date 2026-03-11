'use client';

import { useEffect, useState } from 'react';

interface Question {
  key: string;
  probe: string;
  question: string;
  placeholder: string;
}

interface NovaDialogProps {
  onComplete: () => void;
  onBack?: () => void;
}

const STORAGE_KEY = 'onboarding_nova_dialog';

export default function NovaDialog({ onComplete, onBack }: NovaDialogProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
      } catch {}
    }
    return {};
  });
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/nova/dialog')
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setConfidence(data.confidence || 0);
      })
      .catch(() => setError('Failed to load questions'))
      .finally(() => setLoading(false));
  }, []);

  const updateAnswer = (key: string, value: string) => {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = questions.map((q) => ({
      probe: q.probe,
      question: q.question,
      answer: answers[q.key] || '',
    })).filter((a) => a.answer.trim());

    try {
      const res = await fetch('/api/nova/dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onComplete();
    } catch {
      setError('Failed to save. Try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-px h-12 bg-white/20 mx-auto mb-6 animate-pulse" />
          <p className="text-white/30 text-xs uppercase tracking-widest">Analyzing your profile</p>
        </div>
      </div>
    );
  }

  if (!loading && questions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-6">Profile Complete</p>
          <h1 className="text-3xl font-light text-white mb-3">No gaps to fill.</h1>
          <p className="text-white/40 text-sm mb-10">Your behavioral profile has enough signal to work with.</p>
          <button
            onClick={onComplete}
            className="bg-white text-black font-semibold py-3 px-8 rounded-lg hover:bg-white/90 transition-colors"
          >
            Continue →
          </button>
          <div className="mt-8">
            <button onClick={onBack} className="text-white/25 text-xs hover:text-white/50 transition-colors">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const gapCount = questions.length;
  const newConfidence = Math.min(confidence + gapCount * 8, 100);

  const inputClass = `
    w-full bg-white/5 border border-white/15 rounded-lg px-4 py-3 text-base text-white
    placeholder-white/30 focus:outline-none focus:border-white/50 focus:bg-white/8
    transition-colors resize-none
  `.trim();

  return (
    <div className="min-h-screen bg-black px-6 py-12">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-10">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-3">PatternAligned</p>
          <h1 className="text-4xl font-light text-white mb-3">Fill the gaps</h1>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/8 rounded-full h-px">
              <div
                className="h-px rounded-full transition-all"
                style={{ width: `${confidence}%`, backgroundColor: '#c0c0c0' }}
              />
            </div>
            <span className="text-white/40 text-sm tabular-nums">{confidence}% → ~{newConfidence}%</span>
          </div>
          <p className="text-white/30 text-xs mt-2">
            {gapCount} {gapCount === 1 ? 'question' : 'questions'} to sharpen your profile
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {questions.map((q) => (
            <div key={q.key}>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                {q.question}
              </label>
              <textarea
                placeholder={q.placeholder}
                value={answers[q.key] || ''}
                onChange={(e) => updateAnswer(q.key, e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
          ))}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onComplete}
              className="px-5 py-3 border border-white/15 text-white/40 rounded-lg hover:border-white/30 hover:text-white/60 transition-colors text-sm"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-white text-black font-semibold py-3 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving...' : 'Save & Continue →'}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              ← Back
            </button>
            <p className="text-white/20 text-xs">Step 4 of 4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
