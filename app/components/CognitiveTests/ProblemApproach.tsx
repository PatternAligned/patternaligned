'use client';

import { useState } from 'react';

interface Props {
  onGameComplete?: () => void;
}

interface ProblemChoice {
  id: string;
  title: string;
  description: string;
}

interface ApproachOption {
  id: string;
  style: string;
  description: string;
}

interface GameResult {
  problem_type: string;
  approach_style: string;
  time_spent_seconds: number;
  confidence_level: string;
  decision_speed: string;
}

const problems: ProblemChoice[] = [
  {
    id: 'deadline',
    title: 'Tight Deadline Conflict',
    description: 'Two important projects due same day with limited resources',
  },
  {
    id: 'interpersonal',
    title: 'Team Conflict',
    description: 'Two team members disagree on approach, project stalling',
  },
  {
    id: 'technical',
    title: 'Technical Blocker',
    description: 'Critical system failure with multiple possible root causes',
  },
  {
    id: 'strategic',
    title: 'Strategic Pivot',
    description: 'Market changed, need to decide on new direction quickly',
  },
];

const approaches: ApproachOption[] = [
  {
    id: 'analytical',
    style: 'Analytical',
    description: 'Gather data, analyze options, decide based on facts',
  },
  {
    id: 'intuitive',
    style: 'Intuitive',
    description: 'Trust gut feeling, decide fast based on experience',
  },
  {
    id: 'collaborative',
    style: 'Collaborative',
    description: 'Bring in others, build consensus, decide together',
  },
  {
    id: 'delegative',
    style: 'Delegative',
    description: 'Hand off to expert, trust their judgment',
  },
];

export default function ProblemApproach(props: Props) {
  const [screen, setScreen] = useState<'problem' | 'approach'>('problem');
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [selectedApproach, setSelectedApproach] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gameStartTime = Date.now();

  const handleProblemSelect = (problemId: string) => {
    setSelectedProblem(problemId);
    setScreen('approach');
  };

  const handleApproachSelect = async (approachId: string) => {
    setSelectedApproach(approachId);
    setIsSubmitting(true);

    const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);

    const result: GameResult = {
      problem_type: selectedProblem || '',
      approach_style: approachId,
      time_spent_seconds: timeSpent,
      confidence_level: 'medium',
      decision_speed: timeSpent < 15 ? 'fast' : timeSpent < 45 ? 'balanced' : 'deliberate',
    };

    try {
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'problem_approach',
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

  if (screen === 'problem') {
    return (
      <div className="bg-black min-h-screen text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-light mb-2">Problem Approach</h1>
          <p className="text-white mb-12">Which scenario would you tackle first?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {problems.map((problem) => (
              <button
                key={problem.id}
                onClick={() => handleProblemSelect(problem.id)}
                className="group border border-white rounded-lg p-6 hover:border-[#c0c0c0] hover:bg-[#c0c0c0] transition text-left"
              >
                <h2 className="text-xl font-bold mb-2 group-hover:text-black">{problem.title}</h2>
                <p className="text-white group-hover:text-black/70">{problem.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-light mb-2">Problem Approach</h1>
        <p className="text-white mb-8">How would you approach this?</p>

        {selectedProblem && (
          <div className="bg-white/5 border border-white rounded-lg p-6 mb-12">
            <p className="text-sm text-white mb-2">Selected:</p>
            <p className="text-xl font-bold">
              {problems.find((p) => p.id === selectedProblem)?.title}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {approaches.map((approach) => (
            <button
              key={approach.id}
              onClick={() => handleApproachSelect(approach.id)}
              disabled={isSubmitting}
              className="group border border-white rounded-lg p-6 hover:border-[#c0c0c0] hover:bg-[#c0c0c0] transition text-left disabled:opacity-50"
            >
              <h2 className="text-xl font-bold mb-2 group-hover:text-black">{approach.style}</h2>
              <p className="text-white group-hover:text-black/70">{approach.description}</p>
            </button>
          ))}
        </div>

        {isSubmitting && <p className="text-center mt-8 text-white">Saving...</p>}
      </div>
    </div>
  );
}
