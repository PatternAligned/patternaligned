'use client';

import { useState } from 'react';

interface Props {
  onGameComplete?: () => void;
}

interface EnergyOption {
  id: string;
  name: string;
  description: string;
  pattern: string;
}

interface GameResult {
  energy_pattern: string;
  selection_time_ms: number;
}

const energies: EnergyOption[] = [
  {
    id: 'morning',
    name: 'Morning Person',
    description: 'Peak energy early. Best work before noon.',
    pattern: 'Strong start → Afternoon decline → Evening crash',
  },
  {
    id: 'afternoon',
    name: 'Afternoon Peak',
    description: 'Slow morning. Hits stride mid-day onward.',
    pattern: 'Warm-up phase → Peak mid-afternoon → Strong evening',
  },
  {
    id: 'flow_dependent',
    name: 'Flow Dependent',
    description: 'Energy follows engagement level, not clock.',
    pattern: 'Energized by interesting work. Time disappears in flow.',
  },
  {
    id: 'consistent',
    name: 'Steady State',
    description: 'Consistent energy regardless of time.',
    pattern: 'Reliable baseline. No dramatic peaks or valleys.',
  },
];

export default function EnergyMoodState(props: Props) {
  const [selectedEnergy, setSelectedEnergy] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gameStartTime = Date.now();

  const handleEnergySelect = async (energyId: string) => {
    setSelectedEnergy(energyId);
    setIsSubmitting(true);

    const selectionTime = Date.now() - gameStartTime;

    const result: GameResult = {
      energy_pattern: energyId,
      selection_time_ms: selectionTime,
    };

    try {
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'energy_mood_state',
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
        <h1 className="text-4xl font-bold mb-2">Energy & Mood State</h1>
        <p className="text-gray-400 mb-12">When are you most productive?</p>

        <div className="space-y-4">
          {energies.map((energy) => (
            <button
              key={energy.id}
              onClick={() => handleEnergySelect(energy.id)}
              disabled={isSubmitting}
              className="w-full border border-gray-600 rounded-lg p-6 hover:border-white hover:bg-gray-900 transition text-left disabled:opacity-50"
            >
              <h2 className="text-xl font-bold mb-1">{energy.name}</h2>
              <p className="text-gray-400 mb-3">{energy.description}</p>
              <p className="text-sm text-gray-500 italic">{energy.pattern}</p>
            </button>
          ))}
        </div>

        {isSubmitting && <p className="text-center mt-12 text-gray-400">Saving...</p>}
      </div>
    </div>
  );
}
