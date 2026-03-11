'use client';

import { useState } from 'react';

interface Props {
  onGameComplete?: () => void;
}

const paces = [
  {
    id: 'sprint',
    name: 'Sprint Mode',
    description: 'Fast-paced, intense bursts. Thrive on urgency and momentum.',
  },
  {
    id: 'cruise',
    name: 'Cruise Control',
    description: 'Steady, consistent pace. Prefer predictable rhythm and routine.',
  },
  {
    id: 'flow',
    name: 'Flow State',
    description: 'Variable pace. Work best when deep in problem-solving zone.',
  },
  {
    id: 'adaptive',
    name: 'Adaptive',
    description: 'Match the context. Fast when needed, slow when precision matters.',
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

    try {
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'pace_rhythm',
            pace_preference: paceId,
            response_time_ms: responseTime,
            rhythm_type: responseTime < 8000 ? 'quick_decision' : 'thoughtful_decision',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to log game result');
      props.onGameComplete?.();
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
        <h1 className="text-4xl font-light mb-2">Pace Rhythm</h1>
        <p className="text-white/40 mb-12">How do you naturally work?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paces.map((pace) => (
            <button
              key={pace.id}
              onClick={() => handlePaceSelect(pace.id)}
              disabled={isSubmitting}
              className="group border border-white/15 rounded-xl p-6 hover:border-[#c0c0c0] hover:bg-[#c0c0c0] transition text-left disabled:opacity-50"
            >
              <h2 className="text-xl font-medium mb-2 text-white group-hover:text-black">{pace.name}</h2>
              <p className="text-white/50 group-hover:text-black/70 text-sm">{pace.description}</p>
            </button>
          ))}
        </div>

        {isSubmitting && (
          <p className="text-center mt-12 text-white/30 text-sm">Saving...</p>
        )}
      </div>
    </div>
  );
}
