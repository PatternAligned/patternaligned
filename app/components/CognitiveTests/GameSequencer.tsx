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

const GAME_INDEX_KEY = 'onboarding_game_index';

function loadGameIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = sessionStorage.getItem(GAME_INDEX_KEY);
    return saved ? parseInt(saved, 10) : 0;
  } catch { return 0; }
}

export default function GameSequencer(props: Props) {
  const [currentGameIndex, setCurrentGameIndex] = useState(loadGameIndex);

  const handleBack = () => {
    if (currentGameIndex > 0) {
      const prev = currentGameIndex - 1;
      setCurrentGameIndex(prev);
      try { sessionStorage.setItem(GAME_INDEX_KEY, String(prev)); } catch {}
    } else {
      try { sessionStorage.removeItem(GAME_INDEX_KEY); } catch {}
      props.onBack?.();
    }
  };

  const handleGameComplete = () => {
    if (currentGameIndex < games.length - 1) {
      const next = currentGameIndex + 1;
      setCurrentGameIndex(next);
      try { sessionStorage.setItem(GAME_INDEX_KEY, String(next)); } catch {}
    } else {
      try { sessionStorage.removeItem(GAME_INDEX_KEY); } catch {}
      props.onAllGamesComplete?.();
    }
  };

  const currentGame = games[currentGameIndex];
  const CurrentGameComponent = currentGame.component;

  return (
    <div className="bg-black min-h-screen text-white">
      <div style={{ backgroundColor: '#1a1a1a' }} className="border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="text-white/30 text-sm hover:text-white/60 transition-colors"
              >
                ← Back
              </button>
              <span className="text-sm text-white/40">
                Assessment {currentGameIndex + 1} of {games.length}
              </span>
            </div>
            <span className="text-sm text-white/40">{currentGame.name}</span>
          </div>
          <div className="w-full bg-white/8 rounded-full h-px">
            <div
              className="h-px rounded-full transition-all duration-300"
              style={{
                width: `${((currentGameIndex + 1) / games.length) * 100}%`,
                backgroundColor: '#c0c0c0',
              }}
            />
          </div>
        </div>
      </div>
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
