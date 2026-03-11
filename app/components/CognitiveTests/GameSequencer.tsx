'use client';

import { useState } from 'react';
import CuriosityVector from './CuriosityVector';
import ProblemApproach from './ProblemApproach';
import PaceRhythm from './PaceRhythm';
import CommunicationMirror from './CommunicationMirror';
import RiskOpenness from './RiskOpenness';
import EnergyMoodState from './EnergyMoodState';

interface Props {
  onAllGamesComplete?: () => void;
  onBack?: () => void;
}

const games = [
  { id: 1, name: 'Curiosity Vector', component: CuriosityVector },
  { id: 2, name: 'Problem Approach', component: ProblemApproach },
  { id: 3, name: 'Pace Rhythm', component: PaceRhythm },
  { id: 4, name: 'Communication Mirror', component: CommunicationMirror },
  { id: 5, name: 'Risk Openness', component: RiskOpenness },
  { id: 6, name: 'Energy Mood State', component: EnergyMoodState },
];

export default function GameSequencer(props: Props) {
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [completedGames, setCompletedGames] = useState<number[]>([]);

  const handleBack = () => {
    if (currentGameIndex > 0) {
      setCurrentGameIndex(currentGameIndex - 1);
      setCompletedGames(completedGames.filter((id) => id !== games[currentGameIndex - 1].id));
    } else {
      props.onBack?.();
    }
  };

  const handleGameComplete = () => {
    const gameId = games[currentGameIndex].id;
    setCompletedGames([...completedGames, gameId]);

    if (currentGameIndex < games.length - 1) {
      setCurrentGameIndex(currentGameIndex + 1);
    } else {
      if (props.onAllGamesComplete) {
        props.onAllGamesComplete();
      }
    }
  };

  const currentGame = games[currentGameIndex];
  const CurrentGameComponent = currentGame.component;

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Progress bar */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="text-white/30 text-sm hover:text-white/60 transition-colors"
              >
                ← Back
              </button>
              <span className="text-sm text-gray-400">
                Assessment {currentGameIndex + 1} of {games.length}
              </span>
            </div>
            <span className="text-sm text-gray-400">{currentGame.name}</span>
          </div>
          <div className="w-full bg-white/8 rounded-full h-px">
            <div
              className="h-px rounded-full transition-all duration-300"
              style={{
                width: `${((currentGameIndex + 1) / games.length) * 100}%`,
                backgroundColor: '#c0c0c0',
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Game component with callback */}
      <GameWrapper component={CurrentGameComponent} onComplete={handleGameComplete} />
    </div>
  );
}

interface GameWrapperProps {
  component: React.ComponentType<{ onGameComplete?: () => void }>;
  onComplete: () => void;
}

function GameWrapper({ component: Component, onComplete }: GameWrapperProps) {
  return <Component onGameComplete={onComplete} />;
}

