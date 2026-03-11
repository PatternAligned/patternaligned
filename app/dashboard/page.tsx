'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import WorkspaceLayout from '@/app/components/WorkspaceLayout';
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
  render: 'Render', supabase: 'Supabase', postgres: 'PostgreSQL',
  docker: 'Docker', aws: 'AWS', gcp: 'GCP', jira: 'Jira',
  airtable: 'Airtable', retool: 'Retool', postman: 'Postman',
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [novaPreFill, setNovaPreFill] = useState<string | undefined>(undefined);

  const handleAskNova = (prompt: string) => {
    setNovaPreFill(prompt);
    // WorkspaceLayout handles opening Nova
    window.dispatchEvent(new CustomEvent('open-nova', { detail: { prompt } }));
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

  const probeLabels: Record<string, string> = {
    compression_profile: 'Information',
    friction_profile: 'Friction',
    execution_profile: 'Execution',
    contradiction_profile: 'Conflict',
  };

  return (
    <WorkspaceLayout
      onProjectSelect={(p) => router.push(`/dashboard/workspace/${p.id}`)}
    >
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Profile header */}
        <div className="flex items-start gap-5 mb-10">
          {session.user?.image && (
            <img src={session.user.image} className="w-12 h-12 rounded-xl border border-white/10 object-cover shrink-0" alt="" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-light text-white">{session.user?.name || 'User'}</h1>
              <span className="text-white/20 text-xs">·</span>
              <Link href="/dashboard/profile">
                <span className="text-white/30 text-xs hover:text-white/60 transition-colors cursor-pointer">
                  View full profile →
                </span>
              </Link>
            </div>
            <p className="text-white/35 text-sm">{session.user?.email}</p>
            {interviewProfiles?.overall_summary && (
              <p className="text-white/55 text-sm mt-2 leading-relaxed max-w-xl">{interviewProfiles.overall_summary}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-3xl font-light tabular-nums text-white">{confidence}%</div>
            <div className="text-white/30 text-xs mt-0.5">profile signal</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">

          {/* Left: behavioral profile */}
          <div className="col-span-12 lg:col-span-8 space-y-5">

            {/* Interview probe tiles */}
            {interviewProfiles && (
              <div className="border border-white/8 rounded-2xl p-5">
                <p className="text-white/25 text-xs uppercase tracking-widest mb-4">Interview Profile</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['compression_profile', 'friction_profile', 'execution_profile', 'contradiction_profile'] as const).map((key) => (
                    <div key={key} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                      <div className="text-white/30 text-xs mb-1.5">{probeLabels[key]}</div>
                      <div className="text-white text-sm font-medium capitalize mb-1">{interviewProfiles[key].preference}</div>
                      <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{interviewProfiles[key].description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game measurements */}
            {Object.keys(gameMeasurements).length > 0 && (
              <div className="border border-white/8 rounded-2xl p-5">
                <p className="text-white/25 text-xs uppercase tracking-widest mb-4">Cognitive Assessments</p>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(gameMeasurements).map(([k, v]) => (
                    <div key={k} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                      <div className="text-white/30 text-xs mb-1">{formatKey(k)}</div>
                      <div className="text-white text-sm font-medium">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Behavioral pattern insights */}
            {profile?.insights && profile.insights.length > 0 && (
              <div className="border border-white/8 rounded-2xl p-5">
                <p className="text-white/25 text-xs uppercase tracking-widest mb-4">Behavioral Patterns</p>
                <div className="space-y-3">
                  {profile.insights.slice(0, 4).map((insight, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 border ${
                        insight.type === 'synergy'
                          ? 'bg-white/[0.03] border-white/10'
                          : 'bg-white/[0.02] border-white/[0.06]'
                      }`}
                    >
                      <div className="text-white/30 text-xs mb-1.5">
                        {insight.type === 'synergy' ? '↑ Synergy' : '⟷ Tension'} · {insight.attributes.map(formatKey).join(' + ')}
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed">{insight.insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!dataLoading && !hasProfile && (
              <div className="border border-white/8 rounded-2xl p-10 text-center">
                <p className="text-white/30 text-sm mb-6">No behavioral data yet. Complete the interview and cognitive games to build your profile.</p>
                <div className="flex gap-3 justify-center">
                  <Link href="/onboarding/interview">
                    <span className="text-sm border border-white/20 px-5 py-2.5 rounded-full hover:border-white/50 transition-colors text-white/60 hover:text-white cursor-pointer">
                      Start Interview →
                    </span>
                  </Link>
                  <Link href="/onboarding/cognitive">
                    <span className="text-sm border border-white/20 px-5 py-2.5 rounded-full hover:border-white/50 transition-colors text-white/60 hover:text-white cursor-pointer">
                      Start Games →
                    </span>
                  </Link>
                </div>
              </div>
            )}

            {/* Timeline */}
            <PatternTimeline onAskNova={handleAskNova} />
          </div>

          {/* Right: goals + actions + stack */}
          <div className="col-span-12 lg:col-span-4 space-y-5">

            {/* Confidence bar */}
            {!dataLoading && (
              <div className="border border-white/8 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-white/25 text-xs uppercase tracking-widest">Signal</p>
                  <span className="text-white/50 text-xs">{confidence}%</span>
                </div>
                <div className="bg-white/8 h-px rounded-full mb-4">
                  <div className="h-px rounded-full transition-all" style={{ width: `${confidence}%`, backgroundColor: '#c0c0c0' }} />
                </div>
                <p className="text-white/25 text-xs leading-relaxed">
                  {confidence < 30
                    ? 'Early signal. More interviews and game sessions will sharpen accuracy.'
                    : confidence < 60
                    ? 'Building signal. Nova is learning your patterns.'
                    : 'Strong signal. Nova has reliable context on how you operate.'}
                </p>
                <Link href="/dashboard/profile">
                  <button className="mt-4 w-full text-xs border border-white/12 text-white/40 py-2.5 rounded-lg hover:border-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black transition-all">
                    View full profile
                  </button>
                </Link>
              </div>
            )}

            {/* Goal progress */}
            <div className="border border-white/8 rounded-2xl p-5">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-4">Goal Progress</p>
              {goalProgress.length > 0 ? (
                <div className="space-y-4">
                  {goalProgress.map((g) => (
                    <div key={g.goal}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/60 capitalize">{g.goal.replace(/_/g, ' ')}</span>
                        <span className="text-white/30">{g.interactions}x</span>
                      </div>
                      <div className="w-full bg-white/8 rounded-full h-px">
                        <div className="h-px rounded-full transition-all" style={{ width: `${g.pct}%`, backgroundColor: '#c0c0c0' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : preferences?.goals ? (
                <div>
                  <p className="text-white/50 text-xs mb-2">Current goals:</p>
                  <p className="text-white/60 text-sm leading-relaxed">{preferences.goals}</p>
                  <p className="text-white/20 text-xs mt-3">Chat with Nova to track progress.</p>
                </div>
              ) : (
                <p className="text-white/25 text-sm">No goals set yet.</p>
              )}
            </div>

            {/* Stack */}
            {preferences?.tools && preferences.tools.length > 0 && (
              <div className="border border-white/8 rounded-2xl p-5">
                <p className="text-white/25 text-xs uppercase tracking-widest mb-4">Your Stack</p>
                <div className="flex flex-wrap gap-2">
                  {preferences.tools.map((t) => (
                    <span key={t} className="text-xs border border-white/15 text-white/50 px-3 py-1 rounded-full">
                      {TOOL_LABELS[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="border border-white/8 rounded-2xl p-5">
              <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Actions</p>
              <div className="space-y-px">
                <Link href="/onboarding/cognitive">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <span className="text-sm text-white/55">Run assessment</span>
                    <span className="text-white/25 text-xs">→</span>
                  </div>
                </Link>
                <Link href="/onboarding/interview">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <span className="text-sm text-white/55">New interview</span>
                    <span className="text-white/25 text-xs">→</span>
                  </div>
                </Link>
                <Link href="/dashboard/profile">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <span className="text-sm text-white/55">Refine profile</span>
                    <span className="text-white/25 text-xs">→</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Nova Observations */}
        <div className="mt-5">
          <NovaObservations onAskNova={handleAskNova} />
        </div>

        {/* Threshold Alerts */}
        <div className="mt-5">
          <ThresholdAlerts onAskNova={handleAskNova} />
        </div>

        <div className="border-t border-white/5 mt-12 pt-6 text-center">
          <p className="text-white/15 text-xs tracking-widest">PATTERNALIGNED © 2025</p>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

function formatKey(key: string): string {
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
