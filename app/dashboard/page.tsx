'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nova from '@/app/components/Nova';
import NovaObservations from '@/app/components/NovaObservations';
import PatternTimeline from '@/app/components/PatternTimeline';
import ThresholdAlerts from '@/app/components/ThresholdAlerts';

interface CorrelationData {
  interview_profiles: {
    overall_summary: string;
    confidence_score: number;
    compression_profile: { preference: string; description: string };
    friction_profile: { preference: string; description: string };
    execution_profile: { preference: string; description: string };
    contradiction_profile: { preference: string; description: string };
  } | null;
  game_measurements: Record<string, string>;
  profile: Record<string, string>;
  correlationResult: {
    insights: Array<{ type: string; attributes: string[]; insight: string; implication: string }>;
    workStyleSynthesis: string;
    activationMatchScore: number;
    confidenceScore: number;
  };
}

interface GoalProgress {
  goal: string;
  interactions: number;
  pct: number;
}

interface Preferences {
  use_cases?: string[];
  goals?: string;
  tones?: string[];
  tools?: string[];
}

const TOOL_LABELS: Record<string, string> = {
  vscode: 'VS Code', claude_code: 'Claude Code', cursor: 'Cursor',
  terminal: 'Terminal', github: 'GitHub', slack: 'Slack',
  linear: 'Linear', notion: 'Notion', figma: 'Figma', vercel: 'Vercel',
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [novaOpen, setNovaOpen] = useState(false);
  const [novaPreFill, setNovaPreFill] = useState<string | undefined>(undefined);

  const handleAskNova = (prompt: string) => {
    setNovaPreFill(prompt);
    setNovaOpen(true);
    // Scroll to top where Nova panel is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      fetch('/api/behavioral/correlate').then((r) => r.json()).catch(() => null),
      fetch('/api/goals/progress').then((r) => r.json()).catch(() => ({ progress: [] })),
      fetch('/api/user/preferences').then((r) => r.json()).catch(() => ({ preferences: null })),
    ]).then(([corr, goals, prefs]) => {
      setCorrelationData(corr);
      setGoalProgress(goals?.progress || []);
      setPreferences(prefs?.preferences || null);
    }).finally(() => setDataLoading(false));
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const profile = correlationData?.correlationResult;
  const interviewProfiles = correlationData?.interview_profiles;
  const gameMeasurements = correlationData?.game_measurements || {};
  const hasProfile = !dataLoading && (profile || Object.keys(gameMeasurements).length > 0);
  const confidence = profile?.confidenceScore ?? 0;
  const activation = profile?.activationMatchScore ?? 0;

  const probeLabels: Record<string, string> = {
    compression_profile: 'Information',
    friction_profile: 'Obstacles',
    execution_profile: 'Execution',
    contradiction_profile: 'Conflict',
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-light tracking-tight">PatternAligned</h1>
            <p className="text-white/40 text-xs tracking-widest uppercase mt-1">Behavioral Intelligence</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setNovaOpen(!novaOpen)}
              className={`px-5 py-2 text-sm rounded-full border transition-all ${
                novaOpen
                  ? 'bg-white text-black border-white'
                  : 'border-white/30 text-white hover:border-white/70'
              }`}
            >
              {novaOpen ? 'Close Nova' : 'Open Nova'}
            </button>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: '/auth/signin' })}
              className="px-5 py-2 text-sm border border-white/20 hover:border-white/50 rounded-full transition-colors text-white/70 hover:text-white"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Nova Panel */}
        {novaOpen && (
          <div className="mb-10 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl overflow-hidden" style={{ height: '480px' }}>
            <div className="border-b border-white/10 px-5 py-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm text-white/70 font-medium">Nova</span>
              <span className="text-xs text-white/30 ml-2">tuned to your profile</span>
            </div>
            <div className="h-[calc(100%-48px)] bg-white">
              <Nova initialMessage={novaPreFill} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">

          {/* Left column: profile + confidence */}
          <div className="col-span-12 lg:col-span-8 space-y-6">

            {/* Profile header */}
            <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
              <div className="flex items-start gap-4">
                {session.user?.image && (
                  <img src={session.user.image} className="w-14 h-14 rounded-xl object-cover border border-white/10" alt="" />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-light">{session.user?.name || 'User'}</h2>
                  <p className="text-white/40 text-sm">{session.user?.email}</p>
                  {interviewProfiles?.overall_summary && (
                    <p className="text-white/70 text-sm mt-3 leading-relaxed">{interviewProfiles.overall_summary}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-light">{confidence}%</div>
                  <div className="text-white/40 text-xs">confidence</div>
                </div>
              </div>
            </div>

            {/* Confidence breakdown */}
            {!dataLoading && (
              <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
                <h3 className="text-xs uppercase tracking-widest text-white/40 mb-5">Profile Coverage</h3>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <ConfidenceBar label="Overall Confidence" pct={confidence} color="bg-blue-400" />
                  <ConfidenceBar label="Activation Alignment" pct={activation} color="bg-green-400" />
                </div>

                {/* Per-probe from interview */}
                {interviewProfiles && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {(['compression_profile', 'friction_profile', 'execution_profile', 'contradiction_profile'] as const).map((key) => (
                      <div key={key} className="bg-white/5 rounded-xl p-3">
                        <div className="text-xs text-white/40 mb-1">{probeLabels[key]}</div>
                        <div className="text-sm font-medium capitalize">{interviewProfiles[key].preference}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Game measurements */}
                {Object.keys(gameMeasurements).length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {Object.entries(gameMeasurements).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="bg-white/5 rounded-xl p-3">
                        <div className="text-xs text-white/40 mb-1">{formatKey(k)}</div>
                        <div className="text-sm font-medium">{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {!hasProfile && (
                  <div className="text-center py-6">
                    <p className="text-white/40 text-sm mb-4">No profile data yet.</p>
                    <Link href="/onboarding/cognitive">
                      <span className="text-sm border border-white/30 px-4 py-2 rounded-full hover:border-white/60 transition-colors">
                        Start Assessment →
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Insights */}
            {profile?.insights && profile.insights.length > 0 && (
              <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
                <h3 className="text-xs uppercase tracking-widest text-white/40 mb-5">Behavioral Patterns</h3>
                <div className="space-y-3">
                  {profile.insights.slice(0, 4).map((insight, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 border ${
                        insight.type === 'synergy'
                          ? 'bg-green-500/10 border-green-500/20'
                          : 'bg-amber-500/10 border-amber-500/20'
                      }`}
                    >
                      <div className="text-xs text-white/40 mb-1">
                        {insight.type === 'synergy' ? '↑ Synergy' : '⟷ Tension'} ·{' '}
                        {insight.attributes.map(formatKey).join(' + ')}
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{insight.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: goals + tools + actions */}
          <div className="col-span-12 lg:col-span-4 space-y-6">

            {/* Goal progress */}
            <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
              <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4">Goal Progress</h3>
              {goalProgress.length > 0 ? (
                <div className="space-y-3">
                  {goalProgress.map((g) => (
                    <div key={g.goal}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70 capitalize">{g.goal.replace(/_/g, ' ')}</span>
                        <span className="text-white/40">{g.interactions}x</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div
                          className="bg-blue-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${g.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {preferences?.goals ? (
                    <div>
                      <p className="text-white/50 text-xs mb-3">Your goals:</p>
                      <p className="text-white/70 text-sm leading-relaxed">{preferences.goals}</p>
                      <p className="text-white/30 text-xs mt-3">Chat with Nova to start tracking progress.</p>
                    </div>
                  ) : (
                    <p className="text-white/30 text-sm">No goals set yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Tools */}
            {preferences?.tools && preferences.tools.length > 0 && (
              <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
                <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4">Your Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {preferences.tools.map((t) => (
                    <span key={t} className="text-xs border border-white/20 text-white/60 px-3 py-1 rounded-full">
                      {TOOL_LABELS[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
              <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/onboarding/cognitive">
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <span className="text-sm text-white/70">Run assessment again</span>
                    <span className="text-white/30">→</span>
                  </div>
                </Link>
                <Link href="/onboarding/interview">
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <span className="text-sm text-white/70">New interview session</span>
                    <span className="text-white/30">→</span>
                  </div>
                </Link>
                <div
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setNovaOpen(true)}
                >
                  <span className="text-sm text-white/70">Chat with Nova</span>
                  <span className="text-white/30">→</span>
                </div>
              </div>
            </div>

            {/* Pattern Timeline */}
            <PatternTimeline onAskNova={handleAskNova} />
          </div>
        </div>

        {/* Nova Observations — full width below the grid */}
        <div className="mt-6">
          <NovaObservations onAskNova={handleAskNova} />
        </div>

        {/* Threshold Alerts — full width */}
        <div className="mt-6">
          <ThresholdAlerts onAskNova={handleAskNova} />
        </div>

        <div className="border-t border-white/5 mt-12 pt-6 text-center">
          <p className="text-white/20 text-xs tracking-widest">PATTERNALIGNED © 2025</p>
        </div>
      </div>
    </div>
  );
}

function ConfidenceBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70 font-medium">{pct}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
