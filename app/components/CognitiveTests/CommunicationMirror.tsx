'use client';

import { useState } from 'react';

interface Props {
  onGameComplete?: () => void;
}

interface CommStyle {
  id: string;
  name: string;
  description: string;
  example: string;
}

interface GameResult {
  communication_style: string;
  selection_time_ms: number;
}

const styles: CommStyle[] = [
  {
    id: 'concise',
    name: 'Concise',
    description: 'One-liners. Just the facts. No padding.',
    example: 'Problem: X. Solution: Y. Done.',
  },
  {
    id: 'structured',
    name: 'Structured',
    description: 'Organized. Headers, bullets, clear hierarchy.',
    example: '1. Context\n2. Problem\n3. Solution\n4. Next Steps',
  },
  {
    id: 'narrative',
    name: 'Narrative',
    description: 'Story form. Build context, explain reasoning, conclude.',
    example: 'Here\'s what happened... which led to... so we should...',
  },
  {
    id: 'visual',
    name: 'Visual',
    description: 'Diagrams, flows, schemas. Show, don\'t tell.',
    example: '[DIAGRAM] → Process → [OUTCOME]',
  },
];

export default function CommunicationMirror(props: Props) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gameStartTime = Date.now();

  const handleStyleSelect = async (styleId: string) => {
    setSelectedStyle(styleId);
    setIsSubmitting(true);

    const selectionTime = Date.now() - gameStartTime;

    const result: GameResult = {
      communication_style: styleId,
      selection_time_ms: selectionTime,
    };

    try {
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'communication_mirror',
            ...result,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log game result');
      }

      if (props.onGameComplete) {
        props.onGameComplete();
      }
    } catch (error) {
      console.error('Error logging game result:', error);
      alert('Error saving result. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Communication Mirror</h1>
        <p className="text-gray-400 mb-12">How do you prefer to receive information?</p>

        <div className="space-y-4">
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => handleStyleSelect(style.id)}
              disabled={isSubmitting}
              className="w-full border border-gray-600 rounded-lg p-6 hover:border-white hover:bg-gray-900 transition text-left disabled:opacity-50"
            >
              <h2 className="text-xl font-bold mb-2">{style.name}</h2>
              <p className="text-gray-400 mb-3">{style.description}</p>
              <div className="bg-gray-950 rounded p-3 text-sm text-gray-300 font-mono">
                {style.example}
              </div>
            </button>
          ))}
        </div>

        {isSubmitting && <p className="text-center mt-12 text-gray-400">Saving...</p>}
      </div>
    </div>
  );
}

