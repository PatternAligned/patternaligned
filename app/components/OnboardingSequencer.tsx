'use client';

import { useState } from 'react';
import GameSequencer from './CognitiveTests/GameSequencer';
import RelationshipModelSelector from './RelationshipModelSelector';
import FactsSheet from './FactsSheet';
type Phase = 'games' | 'relationship' | 'facts';

export default function OnboardingSequencer() {
  const [currentPhase, setCurrentPhase] = useState<Phase>('games');

  const handleGamesComplete = () => {
    console.log('✓ Games complete, moving to relationship');
    setCurrentPhase('relationship');
  };

  const handleRelationshipComplete = () => {
    console.log('✓ Relationship selected, moving to facts');
    setCurrentPhase('facts');
  };

  const handleOnboardingComplete = () => {
    console.log('✓ Onboarding complete!');
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-white">
      {currentPhase === 'games' && (
        <GameSequencer onAllGamesComplete={handleGamesComplete} />
      )}

      {currentPhase === 'relationship' && (
        <RelationshipModelSelector
          onSelectionComplete={handleRelationshipComplete}
        />
      )}

      {currentPhase === 'facts' && (
        <FactsSheet onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}