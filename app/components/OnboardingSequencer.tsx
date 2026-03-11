'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GameSequencer from './CognitiveTests/GameSequencer';
import ContextIntake from './ContextIntake';
import SetupIntake from './SetupIntake';
import RelationshipModelSelector from './RelationshipModelSelector';
import FactsSheet from './FactsSheet';
import NovaDialog from './NovaDialog';

type Phase = 'games' | 'context' | 'setup' | 'relationship' | 'facts' | 'nova_dialog';

const HISTORY_KEY = 'onboarding_phase_history';
// Form data keys to clear when starting fresh
const FORM_KEYS = ['onboarding_context', 'onboarding_setup', 'onboarding_game_index'];

function loadHistory(): Phase[] {
  if (typeof window === 'undefined') return ['games'];
  try {
    const saved = sessionStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
    // No saved history = fresh start: clear form data from any previous session
    FORM_KEYS.forEach((k) => { try { sessionStorage.removeItem(k); } catch {} });
    return ['games'];
  } catch { return ['games']; }
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

  return (
    <div className="min-h-screen bg-black">
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
          onSelectionComplete={() => goTo('facts')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'facts' && (
        <FactsSheet
          onComplete={() => goTo('nova_dialog')}
          onBack={goBack}
        />
      )}
      {currentPhase === 'nova_dialog' && (
        <NovaDialog
          onComplete={() => {
            sessionStorage.removeItem(HISTORY_KEY);
            FORM_KEYS.forEach((k) => { try { sessionStorage.removeItem(k); } catch {} });
            window.location.href = '/dashboard';
          }}
          onBack={goBack}
        />
      )}
    </div>
  );
}
