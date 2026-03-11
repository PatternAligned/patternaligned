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
}

export default function NovaDialog({ onComplete }: NovaDialogProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-400">Analyzing your profile...</div>
      </div>
    );
  }

  // If profile is already complete enough, skip
  if (!loading && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2">Profile complete</h1>
          <p className="text-gray-500 mb-8">Your behavioral profile has enough signal. No gaps to fill.</p>
          <button
            onClick={onComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  const gapCount = questions.length;
  const newConfidence = Math.min(confidence + gapCount * 8, 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Confidence indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Fill the gaps</h1>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{confidence}%</div>
              <div className="text-xs text-gray-400">profile confidence</div>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">
            {gapCount} {gapCount === 1 ? 'question' : 'questions'} will bring you to ~{newConfidence}%
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {questions.map((q) => (
            <div key={q.key}>
              <label className="block text-base font-semibold text-gray-800 mb-2">
                {q.question}
              </label>
              <textarea
                placeholder={q.placeholder}
                value={answers[q.key] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onComplete}
              className="px-6 py-3 border border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
