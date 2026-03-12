'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface InterviewProfiles {
  overall_summary: string;
  confidence_score: number;
  compression_profile: { preference: string; description: string };
  friction_profile: { preference: string; description: string };
  execution_profile: { preference: string; description: string };
  contradiction_profile: { preference: string; description: string };
}

interface ProfileData {
  interview_profiles: InterviewProfiles | null;
  game_measurements: Record<string, string>;
  correlationResult: {
    workStyleSynthesis: string;
    confidenceScore: number;
  };
}

const MEASUREMENT_ORDER = [
  'topic_preference',
  'problem_solving_style',
  'pace_preference',
  'communication_style',
  'risk_tolerance',
  'energy_pattern',
  'relationship_model',
];

const MEASUREMENT_LABELS: Record<string, string> = {
  topic_preference: 'Curiosity Vector',
  problem_solving_style: 'Problem Approach',
  pace_preference: 'Work Pace',
  communication_style: 'Communication Mode',
  risk_tolerance: 'Risk Posture',
  energy_pattern: 'Energy Pattern',
  relationship_model: 'Collaboration Model',
};

export default function CognitiveProfile({
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
          <p className="text-white/40 text-xs uppercase tracking-widest">Building your profile</p>
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

  const { interview_profiles, game_measurements, correlationResult } = data;
  const synthesis = correlationResult?.workStyleSynthesis;

  // Build ordered measurements list — show placeholder dashes for missing game data
  const measurements = MEASUREMENT_ORDER.map((key) => ({
    key,
    label: MEASUREMENT_LABELS[key],
    value: game_measurements[key] || '—',
  }));

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-4">PatternAligned · Cognitive Profile</p>
          <h1 className="text-5xl font-light text-white mb-4 leading-tight">
            Your cognitive fingerprint.
          </h1>
          <p className="text-white text-sm leading-relaxed max-w-md">
            Derived from your interview responses and behavioral patterns. This is not a type. It's a map of how you actually operate.
          </p>
        </div>

        {/* Work Style Synthesis */}
        <div className="mb-10">
          <p className="text-white text-xs uppercase tracking-widest mb-3">Work Style Synthesis</p>
          <div className="border border-white/40 rounded-xl p-6" style={{ backgroundColor: '#0a0a0a' }}>
            {synthesis ? (
              <p className="text-white text-sm leading-relaxed">{synthesis}</p>
            ) : interview_profiles?.overall_summary ? (
              <p className="text-white text-sm leading-relaxed">{interview_profiles.overall_summary}</p>
            ) : (
              <p className="text-white/40 text-sm italic">Complete the behavioral interview to generate your work style synthesis.</p>
            )}
          </div>
        </div>

        {/* Behavioral Measurements */}
        <div className="mb-12">
          <p className="text-white text-xs uppercase tracking-widest mb-3">Behavioral Measurements</p>
          <div className="space-y-px">
            {measurements.map(({ key, label, value }) => (
              <div
                key={key}
                className="border border-white/30 flex items-center justify-between px-5 py-4"
                style={{ backgroundColor: '#0a0a0a' }}
              >
                <span className="text-white text-xs uppercase tracking-widest">{label}</span>
                <span className="text-white text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onComplete}
          className="w-full bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-white/90 transition-colors text-sm"
        >
          Continue to Confidence Breakdown →
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
