'use client';

import { useState } from 'react';
import GameSequencer from './CognitiveTests/GameSequencer';
import ContextIntake from './ContextIntake';
import SetupIntake from './SetupIntake';
import RelationshipModelSelector from './RelationshipModelSelector';
import FactsSheet from './FactsSheet';
import NovaDialog from './NovaDialog';

type Phase = 'games' | 'context' | 'setup' | 'relationship' | 'facts' | 'nova_dialog';

export default function OnboardingSequencer() {
  const [currentPhase, setCurrentPhase] = useState<Phase>('games');

  return (
    <div className="min-h-screen bg-white">
      {currentPhase === 'games' && (
        <GameSequencer onAllGamesComplete={() => setCurrentPhase('context')} />
      )}

      {currentPhase === 'context' && (
        <ContextIntake onComplete={() => setCurrentPhase('setup')} />
      )}

      {currentPhase === 'setup' && (
        <SetupIntake onComplete={() => setCurrentPhase('relationship')} />
      )}

      {currentPhase === 'relationship' && (
        <RelationshipModelSelector onSelectionComplete={() => setCurrentPhase('facts')} />
      )}

      {currentPhase === 'facts' && (
        <FactsSheet onComplete={() => setCurrentPhase('nova_dialog')} />
      )}

      {currentPhase === 'nova_dialog' && (
        <NovaDialog onComplete={() => { window.location.href = '/dashboard'; }} />
      )}
    </div>
  );
}
