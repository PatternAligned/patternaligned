'use client';

import { useState } from 'react';

interface Props {
  onSelectionComplete?: () => void;
  onBack?: () => void;
}

interface RelationshipMode {
  id: string;
  name: string;
  description: string;
  how_it_works: string;
}

const modes: RelationshipMode[] = [
  {
    id: 'tool',
    name: 'Tool Mode',
    description: 'Just give me output. Minimal back-and-forth.',
    how_it_works: 'You ask → I deliver → Done. Efficient.',
  },
  {
    id: 'partner',
    name: 'Partner Mode',
    description: 'Work alongside me. I want real collaboration.',
    how_it_works: 'We iterate together. Build ideas back-and-forth.',
  },
  {
    id: 'guide',
    name: 'Structured Guide',
    description: 'Tell me what to do. I follow the path.',
    how_it_works: 'You give clear steps. I execute. Direct.',
  },
  {
    id: 'socratic',
    name: 'Socratic',
    description: 'Ask me questions. I figure it out.',
    how_it_works: 'You ask → I think → I answer. Discovery-driven.',
  },
];

export default function RelationshipModelSelector({ onSelectionComplete, onBack }: Props) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selectedMode) {
      alert('Please select a relationship model first.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'relationship_model_selector',
            selected_mode: selectedMode,
            mode_name: modes.find((m) => m.id === selectedMode)?.name,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save relationship model');
      }

      onSelectionComplete?.();
    } catch (error) {
      console.error('Error saving relationship model:', error);
      alert('Error saving. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-lg mx-auto">
        <div className="mb-10">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-3">PatternAligned</p>
          <h1 className="text-4xl font-light text-white mb-2">How do you want to work?</h1>
          <p className="text-white/40 text-sm">Nova adapts to your preferred dynamic.</p>
        </div>

        <div className="space-y-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              disabled={isSubmitting}
              className={`w-full border rounded-xl p-5 text-left transition-all ${
                selectedMode === mode.id
                  ? 'border-white/40 bg-white/8'
                  : 'border-white/10 hover:border-white/25 hover:bg-white/5'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-medium text-white">{mode.name}</h2>
                {selectedMode === mode.id && (
                  <span className="text-xs text-white/50">selected</span>
                )}
              </div>
              <p className="text-white/50 text-sm mb-2">{mode.description}</p>
              <p className="text-white/25 text-xs">{mode.how_it_works}</p>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={handleContinue}
            disabled={isSubmitting || !selectedMode}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Continue →'}
          </button>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="w-full bg-white/10 rounded-full h-px mb-3">
            <div className="h-px rounded-full" style={{ width: '75%', backgroundColor: '#c0c0c0' }} />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              ← Back
            </button>
            <p className="text-white/20 text-xs">Step 3 of 4</p>
          </div>
        </div>
      </div>
    </div>
  );
}