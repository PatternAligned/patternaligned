'use client';

// PatternAligned branding: ONLY P & A capitalized, never full caps — remove uppercase class

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface ConfidenceScores {
  directness?: number;
  execution?: number;
  friction_tolerance?: number;
  collaboration?: number;
  contradiction_acceptance?: number;
  cognitive_load?: number;
}

interface ProfileData {
  interview_profiles: {
    confidence_score?: number;
    confidence_scores?: ConfidenceScores;
    compression_profile?: { preference: string };
    friction_profile?: { preference: string };
    execution_profile?: { preference: string };
    contradiction_profile?: { preference: string };
  } | null;
  game_measurements: Record<string, string>;
  correlationResult: {
    confidenceScore: number;
  };
}

const DIMENSIONS: { key: keyof ConfidenceScores; label: string }[] = [
  { key: 'directness', label: 'Directness' },
  { key: 'execution', label: 'Execution Style' },
  { key: 'friction_tolerance', label: 'Friction Tolerance' },
  { key: 'collaboration', label: 'Collaboration Model' },
  { key: 'contradiction_acceptance', label: 'Contradiction Acceptance' },
  { key: 'cognitive_load', label: 'Cognitive Load Preference' },
];

function getSource(score: number): string {
  if (score >= 75) return 'Strong signal';
  if (score >= 50) return 'Building';
  return 'No data yet';
}

export default function ConfidenceBreakdown({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack?: () => void;
}) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!(session?.user as any)?.id) return;
    fetch('/api/behavioral/correlate')
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [(session?.user as any)?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-px h-12 bg-white/20 mx-auto mb-6 animate-pulse" />
          <p className="text-white text-xs tracking-widest">Calculating confidence</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <p className="text-white text-sm">{error || 'Failed to load profile'}</p>
      </div>
    );
  }

  const overallScore = data.correlationResult?.confidenceScore ?? 0;
  const ip = data.interview_profiles;

  // Use real scores from interview session if available, otherwise derive heuristically
  const rawScores: ConfidenceScores = ip?.confidence_scores || {};
  const gm = data.game_measurements;

  // Fallback derivation when no interview scores exist
  const getScore = (key: keyof ConfidenceScores): number => {
    if (rawScores[key] !== undefined) return rawScores[key] as number;
    // heuristic fallback from presence of data
    switch (key) {
      case 'directness':
        return (!!ip?.compression_profile && !!gm.communication_style) ? 70
          : (!!ip?.compression_profile || !!gm.communication_style) ? 45 : 12;
      case 'execution':
        return (!!ip?.execution_profile && !!gm.pace_preference) ? 72
          : (!!ip?.execution_profile || !!gm.pace_preference) ? 45 : 12;
      case 'friction_tolerance':
        return (!!ip?.friction_profile && !!gm.risk_tolerance) ? 68
          : (!!ip?.friction_profile || !!gm.risk_tolerance) ? 43 : 12;
      case 'collaboration':
        return !!gm.relationship_model ? 60 : 12;
      case 'contradiction_acceptance':
        return !!ip?.contradiction_profile ? 65 : 12;
      case 'cognitive_load':
        return (!!gm.topic_preference && !!gm.problem_solving_style) ? 62
          : (!!gm.topic_preference || !!gm.problem_solving_style) ? 38 : 12;
      default:
        return 12;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          {/* PatternAligned branding: ONLY P & A capitalized, never full caps — remove uppercase class */}
          <p className="text-white text-xs tracking-[0.2em] mb-4">PatternAligned · Signal Confidence</p>
          <h1 className="text-5xl font-light text-white mb-4 leading-tight">
            How well do we know you?
          </h1>
          <p className="text-white text-sm leading-relaxed max-w-md">
            Confidence scores reflect how much behavioral signal we've collected per dimension. More data means sharper calibration.
          </p>
        </div>

        {/* Overall confidence metric */}
        <div className="mb-10 border border-white rounded-xl p-6" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-white text-xs uppercase tracking-widest">Overall Signal Confidence</p>
            <span className="text-4xl font-light" style={{ color: '#c0c0c0' }}>{overallScore}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-px">
            <div
              className="h-px rounded-full transition-all duration-700"
              style={{ width: `${overallScore}%`, backgroundColor: '#c0c0c0' }}
            />
          </div>
          <p className="text-white text-xs mt-3">
            {overallScore < 30
              ? 'Early stage — complete the games and interview to build signal.'
              : overallScore < 60
              ? 'Building. Chat with Nova or complete more assessments to sharpen calibration.'
              : 'Strong signal. Nova has a solid read on how you work.'}
          </p>
        </div>

        {/* Dimension bars */}
        <div className="mb-12">
          <p className="text-white text-xs uppercase tracking-widest mb-4">Confidence by Dimension</p>
          <div className="space-y-5">
            {DIMENSIONS.map(({ key, label }) => {
              const score = getScore(key);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-xs uppercase tracking-widest">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white text-xs">{getSource(score)}</span>
                      <span className="text-white text-sm font-medium w-10 text-right">{score}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-px">
                    <div
                      className="h-px rounded-full transition-all duration-700"
                      style={{
                        width: `${score}%`,
                        backgroundColor: score >= 75 ? '#c0c0c0' : score >= 40 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onComplete}
          className="w-full bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-white/90 transition-colors text-sm"
        >
          Start Behavioral Games →
        </button>

        <div className="mt-6 flex justify-start">
          <button
            onClick={onBack}
            className="text-white text-xs hover:text-white/60 transition-colors"
          >
            ← Back
          </button>
        </div>

      </div>
    </div>
  );
}
