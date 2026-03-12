'use client';

// PatternAligned branding: ONLY P & A capitalized, never full caps — remove uppercase class

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GameSequencer from './CognitiveTests/GameSequencer';
import ContextIntake from './ContextIntake';
import SetupIntake from './SetupIntake';
import RelationshipModelSelector from './RelationshipModelSelector';
import CognitiveProfile from './CognitiveProfile';
import ConfidenceBreakdown from './ConfidenceBreakdown';
import InterviewChat from './InterviewChat';

// Flow: context → setup → relationship → interview_chat → cognitive_profile → confidence_breakdown → games → done
type Phase =
  | 'context'
  | 'setup'
  | 'relationship'
  | 'interview_chat'
  | 'cognitive_profile'
  | 'confidence_breakdown'
  | 'games';

const HISTORY_KEY = 'onboarding_phase_history';
const FORM_KEYS = ['onboarding_context', 'onboarding_setup', 'onboarding_game_index'];

function loadHistory(): Phase[] {
  if (typeof window === 'undefined') return ['context'];
  try {
    const saved = sessionStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
    FORM_KEYS.forEach((k) => { try { sessionStorage.removeItem(k); } catch {} });
    return ['context'];
  } catch { return ['context']; }
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
          onSelectionComplete={() => goTo('interview_chat')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'interview_chat' && (
        <InterviewChat
          onComplete={() => goTo('cognitive_profile')}
          onBack={goBack}
        />
      )}
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
          onAllGamesComplete={finish}
          onBack={goBack}
        />
      )}
    </div>
  );
}
