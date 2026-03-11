'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PatternInsight, CorrelationResult } from '@/lib/PatternCorrelationEngine';

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
  dialog_fills: Record<string, string>;
  profile: Record<string, string>;
  correlationResult: CorrelationResult;
}

const PROBE_LABELS: Record<string, string> = {
  compression_profile: 'How you take in information',
  friction_profile: 'How you handle obstacles',
  execution_profile: 'How you move from idea to action',
  contradiction_profile: 'How you handle conflict',
};

const ACTIONABLE: Record<string, (pref: string) => string> = {
  compression_profile: (p) =>
    p === 'dense'
      ? 'Ask for the bottom line first. Give others permission to skip the preamble with you.'
      : 'Ask collaborators to strip context down. It\'s not rudeness — it\'s how you process.',
  friction_profile: (p) =>
    p === 'navigate'
      ? 'When blocked, your instinct to route around is usually faster than forcing through. Trust it.'
      : 'You have a high push-through threshold. Watch for when brute force is costing more than a detour would.',
  execution_profile: (p) =>
    p === 'rapid'
      ? 'Protect your bias toward action. Set a "minimum viable analysis" threshold so you don\'t stall in planning loops.'
      : 'Your deliberate approach is a feature. Set decision deadlines so thoroughness doesn\'t become paralysis.',
  contradiction_profile: (p) =>
    p === 'hold'
      ? 'You can sit with tension others can\'t. Use this to your advantage in ambiguous situations — you won\'t panic-resolve prematurely.'
      : 'You\'re wired to resolve. In fast-moving environments, sometimes "good enough and decided" beats "perfect and pending."',
};

type Feedback = 'yes' | 'partial' | 'no';

export default function FactsSheet({ onComplete }: { onComplete?: () => void }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});

  useEffect(() => {
    const fetchCorrelation = async () => {
      try {
        const response = await fetch('/api/behavioral/correlate');
        if (!response.ok) throw new Error('Failed to fetch correlation data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if ((session?.user as any)?.id) fetchCorrelation();
  }, [(session?.user as any)?.id]);

  const logFeedback = async (insightIdx: number, value: Feedback) => {
    setFeedback((f) => ({ ...f, [insightIdx]: value }));
    await fetch('/api/events/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'insight_feedback',
        metadata: { insight_index: insightIdx, feedback: value },
      }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Building your profile...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error || 'Failed to load profile'}</div>
      </div>
    );
  }

  const { interview_profiles, game_measurements, dialog_fills = {}, correlationResult } = data;
  const { insights, workStyleSynthesis, activationMatchScore, confidenceScore } = correlationResult;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Here's how you work</h1>
        <p className="text-gray-500">
          Based on your interview responses and cognitive assessments. This is about you — not a generic type.
        </p>
      </div>

      {/* Confidence banner */}
      <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{confidenceScore}%</div>
          <div className="text-xs text-gray-500">confidence</div>
        </div>
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${confidenceScore}%` }} />
          </div>
          <p className="text-xs text-gray-500">
            {confidenceScore >= 80
              ? 'Strong signal. High confidence in these patterns.'
              : confidenceScore >= 60
              ? 'Good signal. A few more data points would sharpen this.'
              : 'Early signal. Complete more of the assessment to increase accuracy.'}
          </p>
        </div>
      </div>

      {/* Work style synthesis */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h2 className="text-xs font-semibold text-blue-700 uppercase tracking-widest mb-3">Your Work Style</h2>
        <p className="text-base leading-relaxed text-gray-800">{workStyleSynthesis}</p>
      </div>

      {/* Interview-derived profiles */}
      {interview_profiles && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-1">Your cognitive fingerprint</h2>
          <p className="text-sm text-gray-500 mb-4">{interview_profiles.overall_summary}</p>
          <div className="space-y-4">
            {(['compression_profile', 'friction_profile', 'execution_profile', 'contradiction_profile'] as const).map((key) => {
              const probe = interview_profiles[key];
              const actionable = ACTIONABLE[key]?.(probe.preference);
              return (
                <div key={key} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {PROBE_LABELS[key]}
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full capitalize">
                      {probe.preference}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{probe.description}</p>
                  {actionable && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-amber-800">
                        <strong>What this means:</strong> {actionable}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Synergies */}
      {insights.filter((i) => i.type === 'synergy').length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">What amplifies you</h2>
          <div className="space-y-4">
            {insights.filter((i) => i.type === 'synergy').map((insight, idx) => (
              <InsightCard
                key={idx}
                insight={insight}
                type="synergy"
                idx={idx}
                feedback={feedback[idx]}
                onFeedback={(v) => logFeedback(idx, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contradictions */}
      {insights.filter((i) => i.type === 'contradiction').length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Your productive tensions</h2>
          <p className="text-sm text-gray-500 mb-4">
            These aren't flaws — they're places where your preferences pull in opposite directions. Knowing them is an edge.
          </p>
          <div className="space-y-4">
            {insights.filter((i) => i.type === 'contradiction').map((insight, idx) => {
              const globalIdx = insights.filter((i) => i.type === 'synergy').length + idx;
              return (
                <InsightCard
                  key={globalIdx}
                  insight={insight}
                  type="contradiction"
                  idx={globalIdx}
                  feedback={feedback[globalIdx]}
                  onFeedback={(v) => logFeedback(globalIdx, v)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Game measurements */}
      {Object.keys(game_measurements).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-1">Assessment results</h2>
          {Object.keys(dialog_fills).length > 0 && (
            <p className="text-xs text-gray-400 mb-4">
              Values marked <span className="text-indigo-500 font-medium">inferred</span> came from your Nova dialog answers, not the game. Complete the game to lock them in.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(game_measurements).map(([key, value]) => {
              const isDialogFill = key in dialog_fills;
              return (
                <div key={key} className={`border rounded-lg p-3 ${isDialogFill ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{formatKey(key)}</div>
                    {isDialogFill && <span className="text-xs text-indigo-500 font-medium">inferred</span>}
                  </div>
                  <div className="text-sm font-medium text-gray-900">{value}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scores */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        <ScoreBar label="Activation Alignment" score={activationMatchScore} color="bg-green-500"
          tooltip="How well your chosen activation pattern matches your cognitive profile" />
        <ScoreBar label="Profile Confidence" score={confidenceScore} color="bg-blue-500"
          tooltip="Strength of detected behavioral patterns across all data sources" />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => onComplete?.()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
        >
          Go to Dashboard
        </button>
      </div>

    </div>
  );
}

function InsightCard({
  insight, type, idx, feedback, onFeedback,
}: {
  insight: PatternInsight;
  type: 'synergy' | 'contradiction';
  idx: number;
  feedback?: Feedback;
  onFeedback: (v: Feedback) => void;
}) {
  const isSynergy = type === 'synergy';
  return (
    <div className={`border rounded-xl p-4 ${isSynergy ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        {insight.attributes.map(formatKey).join(' · ')}
      </div>
      <p className={`text-sm font-medium mb-2 ${isSynergy ? 'text-green-900' : 'text-amber-900'}`}>
        {insight.insight}
      </p>
      <div className="bg-white bg-opacity-60 rounded-lg p-3 mb-3">
        <p className="text-sm text-gray-700">
          <strong>So:</strong> {insight.implication}
        </p>
      </div>

      {/* Validation */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Does this feel right?</span>
        {(['yes', 'partial', 'no'] as Feedback[]).map((v) => (
          <button
            key={v}
            onClick={() => onFeedback(v)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              feedback === v
                ? 'bg-gray-800 text-white border-gray-800'
                : 'border-gray-300 text-gray-500 hover:border-gray-500'
            }`}
          >
            {v === 'yes' ? 'Yes' : v === 'partial' ? 'Partially' : 'Not really'}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ label, score, color, tooltip }: { label: string; score: number; color: string; tooltip: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4" title={tooltip}>
      <div className="text-xs font-semibold text-gray-600 mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div className={`${color} h-2 rounded-full`} style={{ width: `${score}%` }} />
        </div>
        <div className="text-sm font-bold text-gray-900">{score}%</div>
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
