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

const PROBE_META: Record<string, {
  label: string;
  question: string;
  dense_label?: string;
  sparse_label?: string;
  push_label?: string;
  navigate_label?: string;
  rapid_label?: string;
  deliberate_label?: string;
  resolve_label?: string;
  hold_label?: string;
  leverage: Record<string, string>;
  watchfor: Record<string, string>;
}> = {
  compression_profile: {
    label: 'Information Processing',
    question: 'How you take in and compress information',
    leverage: {
      dense: 'You extract signal at speed. Use this to cut through noise in meetings, documents, and briefs faster than most. Ask for the bottom line first — always.',
      sparse: 'You absorb fully before acting. This makes you thorough and hard to blindside. Use it to catch what others miss when they rush.',
    },
    watchfor: {
      dense: 'You can move on incomplete information and miss nuance others flagged. Slow down on high-stakes decisions.',
      sparse: 'Information overload is a real risk. Set hard limits on inputs before you decide.',
    },
  },
  friction_profile: {
    label: 'Obstacle Response',
    question: 'How you behave when you hit resistance',
    leverage: {
      navigate: 'Your instinct to route around is usually faster than forcing through. When blocked, trust it — you find paths others don\'t see.',
      push: 'Your threshold for pushing through is high. Most people quit before you do. This is an asset in execution.',
    },
    watchfor: {
      navigate: 'Some walls need to be broken, not routed around. Know when the direct path is actually the right one.',
      push: 'Brute force has diminishing returns. Watch for when persistence is costing more than a detour would.',
    },
  },
  execution_profile: {
    label: 'Execution Mode',
    question: 'How you move from idea to action',
    leverage: {
      rapid: 'Your bias toward action is a genuine competitive advantage. Ship, learn, iterate — this is your native loop.',
      deliberate: 'Your thoroughness prevents expensive mistakes. Use it as a forcing function on high-stakes bets where reversibility is low.',
    },
    watchfor: {
      rapid: 'Speed without a minimum-viable analysis threshold leads to rework. Set a floor before shipping.',
      deliberate: 'Thoroughness without a decision deadline becomes paralysis. Time-box your analysis.',
    },
  },
  contradiction_profile: {
    label: 'Tension Tolerance',
    question: 'How you handle competing truths and unresolved conflict',
    leverage: {
      hold: 'You can sit with ambiguity others can\'t. In fast-moving environments, this means you don\'t panic-resolve prematurely.',
      resolve: 'You drive to clarity. In ambiguous situations, you\'re the one who gets a decision made when everyone else is stalling.',
    },
    watchfor: {
      hold: 'Sometimes tension needs resolution, not tolerance. Know when holding both is avoidance.',
      resolve: 'Premature resolution kills nuance. "Good enough and decided" isn\'t always better than "still open."',
    },
  },
};

const MEASUREMENT_LABELS: Record<string, string> = {
  topic_preference: 'Curiosity Vector',
  problem_solving_style: 'Problem Approach',
  pace_preference: 'Work Pace',
  communication_style: 'Communication Mode',
  risk_tolerance: 'Risk Posture',
  energy_pattern: 'Energy Pattern',
  relationship_model: 'Collaboration Model',
  activation_pattern: 'Activation Pattern',
};

const MEASUREMENT_DESCRIPTIONS: Record<string, Record<string, string>> = {
  topic_preference: {
    Abstract: 'You\'re drawn to systems, patterns, and ideas over specifics.',
    Practical: 'You care about what works in the real world, not elegant theory.',
    Historical: 'You understand the present through the lens of how things evolved.',
    Conspiracy: 'You look for the hidden structure beneath the surface narrative.',
    Personal: 'You understand through people — motivations, relationships, dynamics.',
  },
  problem_solving_style: {
    Analytical: 'You map root causes before acting. You want the full picture.',
    Intuitive: 'You trust signal over process. Your gut computes fast.',
    Collaborative: 'You think better in dialogue. Others sharpen your reasoning.',
    Delegative: 'You orchestrate. You find the right person, not the right answer.',
  },
  pace_preference: {
    Sprint: 'Intense bursts, then recovery. You\'re not built for slow and steady.',
    Cruise: 'Sustainable over explosive. You optimize for longevity.',
    Flow: 'You find your own rhythm. External pacing disrupts your output.',
    Adaptive: 'You match the moment. Context determines your gear.',
  },
  communication_style: {
    Concise: 'Bottom line first. Always. The context can follow if needed.',
    Structured: 'You think in frameworks. Logical order is how you process.',
    Narrative: 'You give and need the full arc. Stories land better than bullets.',
    Visual: 'Show, don\'t tell. Diagrams over descriptions.',
  },
  risk_tolerance: {
    Conservative: 'Evidence before commitment. You move when you\'re sure.',
    Measured: 'Calculated bets. You weigh before you leap.',
    Aggressive: 'Move fast, adjust based on results.',
    Adaptive: 'Context-dependent. Stakes determine your posture.',
  },
  energy_pattern: {
    Morning: 'You peak early. Protect your mornings for your highest-leverage work.',
    Afternoon: 'You find your stride after midday.',
    'Flow-Dependent': 'Your energy follows engagement. Interest drives output, not clock.',
    Consistent: 'Steady throughout. You don\'t have a peak — you have a baseline.',
  },
  relationship_model: {
    'tool_mode': 'Purposeful and low-overhead. You want high-signal, low-friction interactions.',
    'partner_mode': 'You think better with others present. Collaboration is generative for you.',
    'structured_guide': 'Clear frameworks before you move. You need the scaffolding.',
    'socratic': 'You learn by being questioned. You want someone to think alongside you.',
  },
  activation_pattern: {
    'Deep Work': 'Long, uninterrupted focus blocks. Context switching is expensive for you.',
    'Banter': 'Rapid-fire back-and-forth. You activate through quick exchange.',
    'Structured': 'Clear agendas and direction. You move when you know the shape of the work.',
    'Quiet': 'Independent, without social overhead. You do your best work alone.',
    'Meditative': 'Reflection and inner processing. Slow in, sharp out.',
  },
};

type Feedback = 'yes' | 'partial' | 'no';

export default function FactsSheet({ onComplete, onBack }: { onComplete?: () => void; onBack?: () => void }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});

  useEffect(() => {
    const fetchCorrelation = async () => {
      try {
        const response = await fetch('/api/behavioral/correlate');
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `API error ${response.status}`);
        }
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-px h-12 bg-white/20 mx-auto mb-6 animate-pulse" />
          <p className="text-white/30 text-xs uppercase tracking-widest">Building your profile</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="border border-white/10 rounded-2xl p-8 max-w-md w-full">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Error</p>
          <p className="text-white text-sm font-mono">{error || 'Failed to load profile'}</p>
        </div>
      </div>
    );
  }

  const { interview_profiles, game_measurements, dialog_fills = {}, correlationResult } = data;
  const { insights, workStyleSynthesis, activationMatchScore, confidenceScore } = correlationResult;
  const synergies = insights.filter((i) => i.type === 'synergy');
  const contradictions = insights.filter((i) => i.type === 'contradiction');

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-16">
          <p className="text-white/25 text-xs uppercase tracking-[0.2em] mb-4">PatternAligned · Cognitive Profile</p>
          <h1 className="text-5xl font-light text-white mb-6 leading-tight">Your cognitive<br />fingerprint.</h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            Derived from your interview responses and behavioral assessments. This is not a type. It's a map of how you actually operate.
          </p>
        </div>

        {/* Signal quality bar */}
        <div className="border border-white/10 rounded-2xl p-6 mb-12 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/30 text-xs uppercase tracking-widest">Signal Confidence</span>
            <span className="text-white font-light text-2xl tabular-nums">{confidenceScore}%</span>
          </div>
          <div className="w-full bg-white/8 rounded-full h-px mb-3">
            <div className="bg-white h-px rounded-full transition-all" style={{ width: `${confidenceScore}%` }} />
          </div>
          <p className="text-white/25 text-xs">
            {confidenceScore >= 80
              ? 'Strong signal. High confidence in these patterns.'
              : confidenceScore >= 60
              ? 'Good signal. More data points will sharpen the edges.'
              : 'Early signal. Complete more of the assessment to increase resolution.'}
          </p>
        </div>

        {/* Core statement */}
        {interview_profiles?.overall_summary && (
          <div className="mb-16">
            <div className="border-l border-white/20 pl-8 py-2">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Core Identity</p>
              <p className="text-white text-xl font-light leading-relaxed">
                {interview_profiles.overall_summary}
              </p>
            </div>
          </div>
        )}

        {/* Work style synthesis */}
        {workStyleSynthesis && (
          <div className="mb-16">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Work Style Synthesis</p>
            <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
              <p className="text-white/80 text-base leading-relaxed">{workStyleSynthesis}</p>
            </div>
          </div>
        )}

        {/* The four cognitive dimensions */}
        {interview_profiles && (
          <div className="mb-16">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-6">The Four Dimensions</p>
            <div className="space-y-4">
              {(['compression_profile', 'friction_profile', 'execution_profile', 'contradiction_profile'] as const).map((key) => {
                const probe = interview_profiles[key];
                const meta = PROBE_META[key];
                const pref = probe.preference;
                const leverage = meta?.leverage?.[pref];
                const watchfor = meta?.watchfor?.[pref];

                return (
                  <div key={key} className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-white/30 text-xs uppercase tracking-widest mb-1">{meta?.label}</p>
                        <p className="text-white/20 text-xs">{meta?.question}</p>
                      </div>
                      <span className="text-xs font-medium text-white bg-white/10 px-3 py-1 rounded-full capitalize border border-white/15">
                        {pref}
                      </span>
                    </div>

                    <p className="text-white/70 text-sm leading-relaxed mb-5 pb-5 border-b border-white/8">
                      {probe.description}
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {leverage && (
                        <div>
                          <p className="text-white/25 text-xs uppercase tracking-widest mb-2">Leverage this</p>
                          <p className="text-white/60 text-xs leading-relaxed">{leverage}</p>
                        </div>
                      )}
                      {watchfor && (
                        <div>
                          <p className="text-white/25 text-xs uppercase tracking-widest mb-2">Watch for</p>
                          <p className="text-white/60 text-xs leading-relaxed">{watchfor}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Behavioral measurements */}
        {Object.keys(game_measurements).length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/30 text-xs uppercase tracking-widest">Behavioral Measurements</p>
              {Object.keys(dialog_fills).length > 0 && (
                <p className="text-white/20 text-xs">
                  <span className="text-white/40">◌</span> inferred from dialog
                </p>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(game_measurements).map(([key, value]) => {
                const isInferred = key in dialog_fills;
                const label = MEASUREMENT_LABELS[key] || key.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
                const description = MEASUREMENT_DESCRIPTIONS[key]?.[value];

                return (
                  <div key={key} className="border border-white/8 rounded-xl p-5 bg-white/[0.015] flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white/30 text-xs uppercase tracking-widest">{label}</p>
                        {isInferred && <span className="text-white/25 text-xs">◌ inferred</span>}
                      </div>
                      {description && (
                        <p className="text-white/50 text-xs leading-relaxed mt-1">{description}</p>
                      )}
                    </div>
                    <span className="text-white text-sm font-medium whitespace-nowrap">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pattern intelligence — synergies */}
        {synergies.length > 0 && (
          <div className="mb-16">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-2">What amplifies you</p>
            <p className="text-white/20 text-xs mb-6">Patterns where your traits reinforce each other</p>
            <div className="space-y-4">
              {synergies.map((insight, idx) => (
                <PatternCard
                  key={idx}
                  insight={insight}
                  type="synergy"
                  globalIdx={idx}
                  feedback={feedback[idx]}
                  onFeedback={(v) => logFeedback(idx, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pattern intelligence — contradictions */}
        {contradictions.length > 0 && (
          <div className="mb-16">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Your productive tensions</p>
            <p className="text-white/20 text-xs mb-6">Where your preferences pull in opposite directions — knowing these is an edge</p>
            <div className="space-y-4">
              {contradictions.map((insight, idx) => {
                const globalIdx = synergies.length + idx;
                return (
                  <PatternCard
                    key={globalIdx}
                    insight={insight}
                    type="contradiction"
                    globalIdx={globalIdx}
                    feedback={feedback[globalIdx]}
                    onFeedback={(v) => logFeedback(globalIdx, v)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Signal scores */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          <ScoreMeter label="Activation Alignment" score={activationMatchScore} />
          <ScoreMeter label="Profile Confidence" score={confidenceScore} />
        </div>

        {/* CTA */}
        <button
          onClick={() => onComplete?.()}
          className="w-full bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-white/90 transition-colors text-sm tracking-wide"
        >
          Go to Dashboard →
        </button>

        <div className="mt-6 flex justify-start">
          <button
            onClick={onBack}
            className="text-white/25 text-xs hover:text-white/50 transition-colors"
          >
            ← Back
          </button>
        </div>

      </div>
    </div>
  );
}

function PatternCard({
  insight, type, globalIdx, feedback, onFeedback,
}: {
  insight: PatternInsight;
  type: 'synergy' | 'contradiction';
  globalIdx: number;
  feedback?: Feedback;
  onFeedback: (v: Feedback) => void;
}) {
  const isSynergy = type === 'synergy';

  return (
    <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1.5 h-1.5 rounded-full ${isSynergy ? 'bg-white/60' : 'bg-white/30'}`} />
        <p className="text-white/25 text-xs uppercase tracking-widest">
          {isSynergy ? 'Amplifier' : 'Tension'} · {insight.attributes.map(k => k.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')).join(' × ')}
        </p>
      </div>

      <p className="text-white text-sm font-medium leading-relaxed mb-4">{insight.insight}</p>

      <div className="border-t border-white/8 pt-4 mb-4">
        <p className="text-white/25 text-xs uppercase tracking-widest mb-2">So what</p>
        <p className="text-white/60 text-sm leading-relaxed">{insight.implication}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-white/25 text-xs">Does this resonate?</span>
        {(['yes', 'partial', 'no'] as Feedback[]).map((v) => (
          <button
            key={v}
            onClick={() => onFeedback(v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              feedback === v
                ? 'bg-white text-black border-white'
                : 'border-white/15 text-white/30 hover:border-white/40 hover:text-white/60'
            }`}
          >
            {v === 'yes' ? 'Yes' : v === 'partial' ? 'Partially' : 'Not really'}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreMeter({ label, score }: { label: string; score: number }) {
  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
      <p className="text-white/30 text-xs uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-end gap-3 mb-3">
        <span className="text-white text-3xl font-light tabular-nums">{score}</span>
        <span className="text-white/30 text-sm mb-1">/ 100</span>
      </div>
      <div className="w-full bg-white/8 rounded-full h-px">
        <div className="bg-white/60 h-px rounded-full" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
