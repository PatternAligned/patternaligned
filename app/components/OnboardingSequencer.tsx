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

const PHASE_ORDER: Phase[] = ['games', 'context', 'setup', 'relationship', 'facts', 'nova_dialog'];

export default function OnboardingSequencer() {
  const router = useRouter();
  const [phaseHistory, setPhaseHistory] = useState<Phase[]>(['games']);

  const currentPhase = phaseHistory[phaseHistory.length - 1];

  const goTo = (phase: Phase) => {
    setPhaseHistory((h) => [...h, phase]);
  };

  const goBack = () => {
    if (phaseHistory.length > 1) {
      setPhaseHistory((h) => h.slice(0, -1));
    } else {
      // First phase (games) — back to interview page
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
          onComplete={() => { window.location.href = '/dashboard'; }}
          onBack={goBack}
        />
      )}
    </div>
  );
}
