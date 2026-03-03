'use client';

import { useState } from 'react';

interface ActivationOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
}

const ACTIVATION_OPTIONS: ActivationOption[] = [
  {
    id: 'deep_work',
    label: 'Deep Work',
    description: 'Long, uninterrupted focus blocks. You need flow time.',
    emoji: '🧠',
  },
  {
    id: 'banter',
    label: 'Banter',
    description: 'Rapid-fire back-and-forth. You think better talking it out.',
    emoji: '💬',
  },
  {
    id: 'structured',
    label: 'Structured',
    description: 'Clear frameworks and direction. You activate with guardrails.',
    emoji: '📋',
  },
  {
    id: 'quiet',
    label: 'Quiet',
    description: 'Independent work without social demands. You prefer solo.',
    emoji: '🤐',
  },
  {
    id: 'meditative',
    label: 'Meditative',
    description: 'Reflection and inner processing. You think inward first.',
    emoji: '🧘',
  },
];

export default function ActivationPatternSelector({
  onSelectionComplete,
}: {
  onSelectionComplete?: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (optionId: string) => {
    setSelected(optionId);
  };

  const handleContinue = async () => {
    if (!selected) return;

    setLoading(true);
    setError(null);

    try {
      const selectedOption = ACTIVATION_OPTIONS.find(
        (opt) => opt.id === selected
      );
      const activationLabel = selectedOption?.label || selected;

      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'activation_pattern_selector',
            activation_pattern: activationLabel,
            selection_id: selected,
            selection_time_ms: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save activation pattern');
      }

      if (onSelectionComplete) {
        onSelectionComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">How Do You Activate?</h1>
        <p className="text-gray-600">
          Pick how you work best. No wrong answers—just what feels natural.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-8">
        {ACTIVATION_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={`text-left p-6 rounded-lg border-2 transition-all ${
              selected === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{option.emoji}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {option.label}
                </h3>
                <p className="text-gray-600">{option.description}</p>
              </div>
              {selected === option.id && (
                <div className="text-2xl">✓</div>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected || loading}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
          !selected || loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? 'Saving...' : 'Continue'}
      </button>
    </div>
  );
}
