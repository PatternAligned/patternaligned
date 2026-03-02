'use client';

import { useState } from 'react';

interface Props {
  onSelectionComplete?: () => void;
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

export default function RelationshipModelSelector(props: Props) {
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

      if (props.onSelectionComplete) {
        props.onSelectionComplete();
      } else {
        alert('Relationship model saved!');
      }
    } catch (error) {
      console.error('Error saving relationship model:', error);
      alert('Error saving. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">How Do You Want to Work?</h1>
        <p className="text-gray-400 mb-12">
          Pick your preferred relationship model. Nova adapts to how you think.
        </p>

        <div className="space-y-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              disabled={isSubmitting}
              className={`w-full border-2 rounded-lg p-6 text-left transition ${
                selectedMode === mode.id
                  ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                  : 'border-gray-600 hover:border-white hover:bg-gray-900'
              } disabled:opacity-50`}
            >
              <h2 className="text-xl font-bold mb-1">{mode.name}</h2>
              <p className="text-gray-400 mb-3">{mode.description}</p>
              <p className="text-sm text-gray-500 italic">{mode.how_it_works}</p>
            </button>
          ))}
        </div>

        {selectedMode && (
          <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-700 mb-6">
            <p className="text-sm text-gray-400 mb-2">Selected:</p>
            <p className="text-lg font-bold">
              {modes.find((m) => m.id === selectedMode)?.name}
            </p>
          </div>
        )}

        {selectedMode && (
          <button
            onClick={handleContinue}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg p-4 font-bold transition"
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}