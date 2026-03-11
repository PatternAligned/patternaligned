'use client';

import { useState } from 'react';

interface Props {
  onGameComplete?: () => void;
}

interface RiskOption {
  id: string;
  name: string;
  description: string;
  behavior: string;
}

interface GameResult {
  risk_tolerance: string;
  selection_time_ms: number;
}

const risks: RiskOption[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Minimize risk. Validate first, move second.',
    behavior: 'Extensive planning. Contingency plans for contingency plans.',
  },
  {
    id: 'measured',
    name: 'Measured',
    description: 'Balance risk and opportunity. Calculated moves.',
    behavior: 'Plan → Test → Adjust. Accept some uncertainty.',
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'High risk for high reward. Move fast, learn faster.',
    behavior: 'Ship → Feedback → Iterate. Comfort with failure.',
  },
  {
    id: 'adaptive',
    name: 'Adaptive',
    description: 'Risk tolerance depends on context and stakes.',
    behavior: 'Conservative on critical. Aggressive on exploratory.',
  },
];

export default function RiskOpenness(props: Props) {
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gameStartTime = Date.now();

  const handleRiskSelect = async (riskId: string) => {
    setSelectedRisk(riskId);
    setIsSubmitting(true);

    const selectionTime = Date.now() - gameStartTime;

    const result: GameResult = {
      risk_tolerance: riskId,
      selection_time_ms: selectionTime,
    };

    try {
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'risk_openness',
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
        <h1 className="text-4xl font-light mb-2">Risk Openness</h1>
        <p className="text-white/40 mb-12">How much risk are you comfortable with?</p>

        <div className="space-y-4">
          {risks.map((risk) => (
            <button
              key={risk.id}
              onClick={() => handleRiskSelect(risk.id)}
              disabled={isSubmitting}
              className="group w-full border border-white/15 rounded-lg p-6 hover:border-[#c0c0c0] hover:bg-[#c0c0c0] transition text-left disabled:opacity-50"
            >
              <h2 className="text-xl font-bold mb-1 group-hover:text-black">{risk.name}</h2>
              <p className="text-white/50 group-hover:text-black/70 mb-3">{risk.description}</p>
              <p className="text-sm text-white/30 italic group-hover:text-black/60">{risk.behavior}</p>
            </button>
          ))}
        </div>

        {isSubmitting && <p className="text-center mt-12 text-white/40">Saving...</p>}
      </div>
    </div>
  );
}
