'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface ProfileData {
  interview_profiles: {
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

interface Dimension {
  label: string;
  score: number;
  source: 'game' | 'interview' | 'both' | 'none';
}

function deriveDimensions(data: ProfileData): Dimension[] {
  const { interview_profiles: ip, game_measurements: gm } = data;

  const hasGame = (key: string) => !!gm[key];
  const hasInterview = (key: keyof NonNullable<typeof ip>) =>
    !!(ip as any)?.[key]?.preference;

  return [
    {
      label: 'Directness',
      score: hasGame('communication_style') && hasInterview('compression_profile') ? 88
        : hasGame('communication_style') ? 65
        : hasInterview('compression_profile') ? 52
        : 12,
      source: hasGame('communication_style') && hasInterview('compression_profile') ? 'both'
        : hasGame('communication_style') ? 'game'
        : hasInterview('compression_profile') ? 'interview'
        : 'none',
    },
    {
      label: 'Execution Style',
      score: hasGame('pace_preference') && hasInterview('execution_profile') ? 90
        : hasGame('pace_preference') ? 62
        : hasInterview('execution_profile') ? 55
        : 10,
      source: hasGame('pace_preference') && hasInterview('execution_profile') ? 'both'
        : hasGame('pace_preference') ? 'game'
        : hasInterview('execution_profile') ? 'interview'
        : 'none',
    },
    {
      label: 'Friction Tolerance',
      score: hasGame('risk_tolerance') && hasInterview('friction_profile') ? 85
        : hasGame('risk_tolerance') ? 60
        : hasInterview('friction_profile') ? 50
        : 10,
      source: hasGame('risk_tolerance') && hasInterview('friction_profile') ? 'both'
        : hasGame('risk_tolerance') ? 'game'
        : hasInterview('friction_profile') ? 'interview'
        : 'none',
    },
    {
      label: 'Collaboration Model',
      score: hasGame('relationship_model') ? 80 : 10,
      source: hasGame('relationship_model') ? 'game' : 'none',
    },
    {
      label: 'Contradiction Acceptance',
      score: hasInterview('contradiction_profile') ? 75 : 10,
      source: hasInterview('contradiction_profile') ? 'interview' : 'none',
    },
    {
      label: 'Cognitive Load Preference',
      score: hasGame('topic_preference') && hasGame('problem_solving_style') ? 82
        : hasGame('topic_preference') || hasGame('problem_solving_style') ? 55
        : 10,
      source: hasGame('topic_preference') || hasGame('problem_solving_style') ? 'game' : 'none',
    },
  ];
}

const SOURCE_LABELS: Record<string, string> = {
  both: 'Interview + Games',
  game: 'Behavioral Games',
  interview: 'Interview',
  none: 'No data yet',
};

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
          <p className="text-white/40 text-xs uppercase tracking-widest">Calculating confidence</p>
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
  const dimensions = deriveDimensions(data);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-4">PatternAligned · Signal Confidence</p>
          <h1 className="text-5xl font-light text-white mb-4 leading-tight">
            How well do we know you?
          </h1>
          <p className="text-white text-sm leading-relaxed max-w-md">
            Confidence scores reflect how much behavioral signal we've collected per dimension. More data means sharper calibration.
          </p>
        </div>

        {/* Overall confidence metric */}
        <div className="mb-10 border border-white/40 rounded-xl p-6" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-white text-xs uppercase tracking-widest">Overall Signal Confidence</p>
            <span className="text-4xl font-light" style={{ color: '#c0c0c0' }}>{overallScore}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-px">
            <div
              className="h-px rounded-full transition-all duration-700"
              style={{ width: `${overallScore}%`, backgroundColor: '#c0c0c0' }}
            />
          </div>
          <p className="text-white/40 text-xs mt-3">
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
            {dimensions.map(({ label, score, source }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-xs uppercase tracking-widest">{label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-xs">{SOURCE_LABELS[source]}</span>
                    <span className="text-white text-sm font-medium w-10 text-right">{score}%</span>
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-px">
                  <div
                    className="h-px rounded-full transition-all duration-700"
                    style={{
                      width: `${score}%`,
                      backgroundColor: score >= 75 ? '#c0c0c0' : score >= 40 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                    }}
                  />
                </div>
              </div>
            ))}
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
