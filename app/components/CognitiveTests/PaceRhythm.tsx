'use client';

import { useState } from 'react';

interface Props {
  onGameComplete?: () => void;
}

interface PaceOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface GameResult {
  pace_preference: string;
  response_time_ms: number;
  rhythm_type: string;
}

const paces: PaceOption[] = [
  {
    id: 'sprint',
    name: 'Sprint Mode',
    description: 'Fast-paced, intense bursts. Thrive on urgency and momentum.',
    icon: '⚡',
  },
  {
    id: 'cruise',
    name: 'Cruise Control',
    description: 'Steady, consistent pace. Prefer predictable rhythm and routine.',
    icon: '🎯',
  },
  {
    id: 'flow',
    name: 'Flow State',
    description: 'Variable pace. Work best when deep in problem-solving zone.',
    icon: '🌊',
  },
  {
    id: 'adaptive',
    name: 'Adaptive',
    description: 'Match the context. Fast when needed, slow when precision matters.',
    icon: '🔄',
  },
];

export default function PaceRhythm(props: Props) {
  const [selectedPace, setSelectedPace] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gameStartTime = Date.now();

  const handlePaceSelect = async (paceId: string) => {
    setSelectedPace(paceId);
    setIsSubmitting(true);

    const responseTime = Date.now() - gameStartTime;

    const result: GameResult = {
      pace_preference: paceId,
      response_time_ms: responseTime,
      rhythm_type: responseTime < 8000 ? 'quick_decision' : 'thoughtful_decision',
    };

    try {
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'pace_rhythm',
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
        <h1 className="text-4xl font-bold mb-2">Pace Rhythm</h1>
        <p className="text-gray-400 mb-12">How do you naturally work?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paces.map((pace) => (
            <button
              key={pace.id}
              onClick={() => handlePaceSelect(pace.id)}
              disabled={isSubmitting}
              className="border border-gray-600 rounded-lg p-6 hover:border-white hover:bg-gray-900 transition text-left disabled:opacity-50"
            >
              <div className="text-4xl mb-3">{pace.icon}</div>
              <h2 className="text-xl font-bold mb-2">{pace.name}</h2>
              <p className="text-gray-400">{pace.description}</p>
            </button>
          ))}
        </div>

        {isSubmitting && <p className="text-center mt-12 text-gray-400">Saving...</p>}
      </div>
    </div>
  );
}
