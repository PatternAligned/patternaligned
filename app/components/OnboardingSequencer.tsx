'use client';

// PatternAligned branding: ONLY P & A capitalized, never full caps — remove uppercase class

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GameSequencer from './CognitiveTests/GameSequencer';
import ContextIntake from './ContextIntake';
import SetupIntake from './SetupIntake';
import CognitiveProfile from './CognitiveProfile';
import ConfidenceBreakdown from './ConfidenceBreakdown';
import InterviewChat from './InterviewChat';

// Flow: context → setup → games → interview_chat → cognitive_profile → confidence_breakdown
type Phase =
  | 'context'
  | 'setup'
  | 'games'
  | 'interview_chat'
  | 'cognitive_profile'
  | 'confidence_breakdown';

const HISTORY_KEY = 'onboarding_phase_history';
const HISTORY_VERSION = 'v3'; // bump this to invalidate stale sessionStorage
const FORM_KEYS = ['onboarding_context', 'onboarding_setup', 'onboarding_game_index'];

const VALID_PHASES = new Set(['context', 'setup', 'games', 'interview_chat', 'cognitive_profile', 'confidence_breakdown']);

function loadHistory(): Phase[] {
  if (typeof window === 'undefined') return ['context'];
  try {
    const saved = sessionStorage.getItem(HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate: must be an array, have a version match, and all phases must be valid
      if (
        Array.isArray(parsed) &&
        parsed[0] === HISTORY_VERSION &&
        parsed.slice(1).every((p: string) => VALID_PHASES.has(p))
      ) {
        return parsed.slice(1) as Phase[];
      }
      // Stale or invalid — clear it
      sessionStorage.removeItem(HISTORY_KEY);
      FORM_KEYS.forEach((k) => { try { sessionStorage.removeItem(k); } catch {} });
    }
    return ['context'];
  } catch { return ['context']; }
}

function saveHistory(h: Phase[]) {
  try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify([HISTORY_VERSION, ...h])); } catch {}
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

  const finish = async () => {
    sessionStorage.removeItem(HISTORY_KEY);
    FORM_KEYS.forEach((k) => { try { sessionStorage.removeItem(k); } catch {} });
    try {
      await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'onboarding_complete', metadata: { timestamp: new Date().toISOString() } }),
      });
    } catch {}
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
          onComplete={() => goTo('games')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'games' && (
        <GameSequencer
          onAllGamesComplete={() => goTo('interview_chat')}
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
          onComplete={finish}
          onBack={goBack}
        />
      )}
    </div>
  );
}
