'use client';

import { useEffect, useState } from 'react';

interface BehavioralMeasurements {
  decisionVelocity: string;
  riskTolerance: string;
  infoStructure: string;
  conflictApproach: string;
  pacePreference: string;
  curiosityVector: string;
}

interface ProfileData {
  whoYouAre: string;
  howYouDecide: string;
  whatYouNeed: string;
  measurements: BehavioralMeasurements;
  confidence: { score: number; explanation: string };
  isValidated: boolean;
  userSelfRating: number | null;
}

interface ProfileSummaryProps {
  onAccurate: () => void;
  onRefine: () => void;
}

function splitMeasurement(raw: string): { label: string; value: string } {
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return { label: '', value: raw };
  return {
    label: raw.slice(0, colonIdx).trim(),
    value: raw.slice(colonIdx + 1).trim(),
  };
}

export default function ProfileSummary({ onAccurate, onRefine }: ProfileSummaryProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        // Try current first
        const currentRes = await fetch('/api/profile/current');
        const currentData = await currentRes.json();

        if (currentData.found && currentData.profile) {
          setProfile(currentData.profile);
          setLoading(false);
          return;
        }

        // Not found — generate fresh
        setRegenerating(true);
        const genRes = await fetch('/api/profile/generate');
        if (!genRes.ok) {
          const errData = await genRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to generate profile');
        }
        const genData = await genRes.json();
        setProfile(genData.profile);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
        setRegenerating(false);
      }
    }

    loadProfile();
  }, []);

  if (loading || regenerating) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-px h-12 bg-white/20 mx-auto mb-6 animate-pulse" />
          <p className="text-white/30 text-xs uppercase tracking-[0.2em]">
            {regenerating ? 'Generating your behavioral profile...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-4">Profile</p>
          <p className="text-white text-lg mb-3">{error || 'No behavioral data yet.'}</p>
          <p className="text-white/40 text-sm mb-8">
            Complete the interview and cognitive assessments to generate your profile.
          </p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              setRegenerating(true);
              fetch('/api/profile/generate')
                .then((r) => r.json())
                .then((data) => {
                  if (data.profile) setProfile(data.profile);
                  else setError('No data available yet.');
                })
                .catch(() => setError('Failed to generate profile'))
                .finally(() => { setLoading(false); setRegenerating(false); });
            }}
            className="text-white/50 text-sm border border-white/20 px-6 py-2 rounded-full hover:border-white/40 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const measurementRows = [
    profile.measurements.decisionVelocity,
    profile.measurements.riskTolerance,
    profile.measurements.infoStructure,
    profile.measurements.conflictApproach,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-14">
          <p className="text-white/20 text-xs uppercase tracking-[0.2em] mb-6">
            PatternAligned · Cognitive Profile
          </p>
          <h1 className="text-4xl font-light mb-3">Your Cognitive Profile</h1>
          <p className="text-white/35 text-sm leading-relaxed mb-12">
            Derived from your interview responses and behavioral assessments. This is not a type — it's a map of how you actually operate.
          </p>
        </div>

        {/* Who You Are */}
        <div className="mb-10">
          <p className="text-white/20 text-xs uppercase tracking-[0.15em] mb-4">Who you are</p>
          <p className="text-white text-lg font-light leading-relaxed">{profile.whoYouAre}</p>
        </div>

        {/* How You Decide */}
        <div className="mb-10">
          <p className="text-white/20 text-xs uppercase tracking-[0.15em] mb-4">How you decide</p>
          <p className="text-white/70 text-sm leading-relaxed mb-6">{profile.howYouDecide}</p>

          {/* Measurement rows */}
          <div className="space-y-3">
            {measurementRows.map((raw, i) => {
              const { label, value } = splitMeasurement(raw);
              return (
                <div key={i} className="border-l border-white/10 pl-4 py-1">
                  {label && (
                    <p className="text-white/25 text-xs uppercase tracking-[0.12em] mb-1">{label}</p>
                  )}
                  <p className="text-white/70 text-sm leading-relaxed">{value}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* What You Need */}
        <div className="mb-10">
          <p className="text-white/20 text-xs uppercase tracking-[0.15em] mb-4">What you need from Nova</p>
          <p className="text-white/70 text-sm leading-relaxed">{profile.whatYouNeed}</p>
        </div>

        {/* Signal Confidence */}
        <div className="mb-12">
          <p className="text-white/20 text-xs uppercase tracking-[0.15em] mb-4">Signal confidence</p>
          <div className="flex items-start gap-5">
            <span className="text-6xl font-light tabular-nums text-white">
              {profile.confidence.score}
            </span>
            <div className="flex-1 pt-2">
              <div className="bg-white/8 h-px mb-3">
                <div
                  className="h-px"
                  style={{ width: `${profile.confidence.score}%`, backgroundColor: '#c0c0c0' }}
                />
              </div>
              <p className="text-white/35 text-sm leading-relaxed">
                {profile.confidence.explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Validation Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onAccurate}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-white/90 transition-colors"
          >
            This is accurate. Go to workspace →
          </button>
          <button
            onClick={onRefine}
            className="w-full border border-white/20 text-white/60 font-medium py-4 rounded-xl hover:border-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black transition-all"
          >
            Need to refine. Chat with Nova ↓
          </button>
        </div>

      </div>
    </div>
  );
}
