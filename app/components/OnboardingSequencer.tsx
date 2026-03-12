'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GameSequencer from './CognitiveTests/GameSequencer';
import ContextIntake from './ContextIntake';
import SetupIntake from './SetupIntake';
import RelationshipModelSelector from './RelationshipModelSelector';
import CognitiveProfile from './CognitiveProfile';
import ConfidenceBreakdown from './ConfidenceBreakdown';

type Phase = 'cognitive_profile' | 'confidence_breakdown' | 'games' | 'context' | 'setup' | 'relationship';

const HISTORY_KEY = 'onboarding_phase_history';
// Form data keys to clear when starting fresh
const FORM_KEYS = ['onboarding_context', 'onboarding_setup', 'onboarding_game_index'];

function loadHistory(): Phase[] {
  if (typeof window === 'undefined') return ['cognitive_profile'];
  try {
    const saved = sessionStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
    // No saved history = fresh start: clear form data from any previous session
    FORM_KEYS.forEach((k) => { try { sessionStorage.removeItem(k); } catch {} });
    return ['cognitive_profile'];
  } catch { return ['cognitive_profile']; }
}

function saveHistory(h: Phase[]) {
  try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {}
}

export default function OnboardingSequencer() {
  const router = useRouter();
  const [phaseHistory, setPhaseHistory] = useState<Phase[]>(loadHistory);

  const currentPhase = phaseHistory[phaseHistory.length - 1];

  const goTo = (phase: Phase) => {
    setPhaseHistory((h) => {
      const next = [...h, phase];
      saveHistory(next);
      return next;
    });
  };

  const goBack = () => {
    if (phaseHistory.length > 1) {
      setPhaseHistory((h) => {
        const prev = h.slice(0, -1);
        saveHistory(prev);
        return prev;
      });
    } else {
      router.push('/onboarding/interview');
    }
  };

  const finish = () => {
    sessionStorage.removeItem(HISTORY_KEY);
    FORM_KEYS.forEach((k) => { try { sessionStorage.removeItem(k); } catch {} });
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-black">
      {currentPhase === 'cognitive_profile' && (
        <CognitiveProfile
          onComplete={() => goTo('confidence_breakdown')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'confidence_breakdown' && (
        <ConfidenceBreakdown
          onComplete={() => goTo('games')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'games' && (
        <GameSequencer
          onAllGamesComplete={() => goTo('context')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'context' && (
        <ContextIntake
          onComplete={() => goTo('setup')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'setup' && (
        <SetupIntake
          onComplete={() => goTo('relationship')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'relationship' && (
        <RelationshipModelSelector
          onSelectionComplete={finish}
          onBack={goBack}
        />
      )}
    </div>
  );
}
