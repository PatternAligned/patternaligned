'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function FourProbeOnboarding() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({
    compression: '',
    friction: '',
    execution: '',
    contradiction: '',
  });

  const probes = [
    {
      id: 'compression',
      label: 'Compression',
      question: 'How do you prefer to process information?',
      options: [
        { value: 'dense', label: 'Dense, detailed, layered' },
        { value: 'sparse', label: 'Sparse, stripped down, direct' },
      ],
    },
    {
      id: 'friction',
      label: 'Friction',
      question: 'How do you respond to resistance or obstacles?',
      options: [
        { value: 'push', label: 'Push through, force solutions' },
        { value: 'navigate', label: 'Navigate around, find alternatives' },
      ],
    },
    {
      id: 'execution',
      label: 'Execution',
      question: 'How do you move from idea to action?',
      options: [
        { value: 'rapid', label: 'Rapid, iterative, fail-forward' },
        { value: 'deliberate', label: 'Deliberate, planned, validated' },
      ],
    },
    {
      id: 'contradiction',
      label: 'Contradiction',
      question: 'How do you handle conflicting information?',
      options: [
        { value: 'resolve', label: 'Resolve it, find truth' },
        { value: 'hold', label: 'Hold both, explore tension' },
      ],
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/behavioral/4-probe', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-user-email': session?.user?.email || ''
  },
  body: JSON.stringify(answers),
});

      if (!response.ok) {
        throw new Error('Failed to save 4-probe answers');
      }

      router.push('/onboarding/games');
    } catch (error) {
      console.error('Error submitting 4-probe:', error);
      setLoading(false);
    }
  };

  const allAnswered = Object.values(answers).every(v => v !== '');

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-light mb-2">Cognitive Fingerprint</h1>
          <p className="text-silver text-sm">4 probes. 5 minutes. We learn how you think.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {probes.map((probe, idx) => (
            <div key={probe.id} className="border border-silver/20 rounded p-6 bg-gray-900/50">
              {/* Probe number + label */}
              <div className="mb-4">
                <div className="text-silver text-xs mb-1">{idx + 1} of 4</div>
                <h2 className="text-xl font-light">{probe.question}</h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {probe.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-3 border border-silver/10 rounded cursor-pointer hover:border-silver/30 transition"
                  >
                    <input
                      type="radio"
                      name={probe.id}
                      value={option.value}
                      checked={answers[probe.id as keyof typeof answers] === option.value}
                      onChange={(e) =>
                        setAnswers({ ...answers, [probe.id]: e.target.value })
                      }
                      className="mr-3"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!allAnswered || loading}
            className="w-full py-3 bg-white text-black font-light rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-silver transition"
          >
            {loading ? 'Saving...' : 'Continue to Behavioral Games'}
          </button>
        </form>
      </div>
    </div>
  );
}