'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Observation {
  id: string;
  severity: 'info' | 'warning' | 'alert';
  title: string;
  body: string;
}

interface Alert {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
  suggestion: string;
}

interface Connector {
  model: string;
  isConnected: boolean;
}

const MODEL_LABELS: Record<string, string> = {
  claude: 'Claude',
  gpt: 'GPT',
  ollama: 'Ollama',
  perplexity: 'Perplexity',
};

const severityDot: Record<string, string> = {
  alert: 'bg-red-400',
  warning: 'bg-yellow-400',
  info: 'bg-white/30',
  critical: 'bg-red-500',
};

export default function StatsPanel() {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/behavioral/correlate').then((r) => r.json()).catch(() => null),
      fetch('/api/nova/observations').then((r) => r.json()).catch(() => ({ observations: [] })),
      fetch('/api/nova/alerts').then((r) => r.json()).catch(() => ({ alerts: [] })),
      fetch('/api/connectors/list').then((r) => r.json()).catch(() => []),
    ]).then(([corr, obs, alrt, conn]) => {
      setConfidence(corr?.correlationResult?.confidenceScore ?? null);
      setObservations(obs?.observations || []);
      setAlerts(alrt?.alerts || []);
      setConnectors(Array.isArray(conn) ? conn : []);
    }).finally(() => setLoading(false));
  }, []);

  const nextActionText = () => {
    if (confidence === null) return 'Complete the interview to start building signal.';
    if (confidence < 30) return 'Complete interview to build signal.';
    if (confidence < 60) return 'Chat with Nova to build signal.';
    return 'Strong signal — Nova is calibrated.';
  };

  const showActionBtn = confidence !== null && confidence < 60;

  return (
    <div
      className="w-72 shrink-0 h-screen overflow-y-auto border-l border-[#333] py-5 px-4 space-y-4"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Signal Confidence */}
      <div className="border border-white/10 rounded-2xl p-4">
        <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Signal Confidence</p>
        {loading ? (
          <div className="h-8 bg-white/5 rounded animate-pulse" />
        ) : (
          <>
            <div className="text-3xl font-light tabular-nums text-white mb-2">
              {confidence ?? 0}%
            </div>
            <div className="bg-white/8 h-px rounded-full mb-3">
              <div
                className="h-px rounded-full transition-all"
                style={{ width: `${confidence ?? 0}%`, backgroundColor: '#c0c0c0' }}
              />
            </div>
            <p className="text-white/30 text-xs leading-relaxed">
              {(confidence ?? 0) < 30
                ? 'Early signal. Complete interview and games to improve accuracy.'
                : (confidence ?? 0) < 60
                ? 'Building signal. Nova is learning your patterns.'
                : 'Strong signal. Nova has reliable context on how you operate.'}
            </p>
          </>
        )}
      </div>

      {/* Recent Signals */}
      <div className="border border-white/10 rounded-2xl p-4">
        <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Recent Signals</p>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : observations.length === 0 ? (
          <p className="text-white/20 text-xs">No signals yet</p>
        ) : (
          <div className="space-y-2.5">
            {observations.slice(0, 4).map((obs) => (
              <div key={obs.id} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityDot[obs.severity]}`} />
                <p className="text-white/55 text-xs leading-relaxed">{obs.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drift Alerts */}
      <div className="border border-white/10 rounded-2xl p-4">
        <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Drift Alerts</p>
        {loading ? (
          <div className="h-4 bg-white/5 rounded animate-pulse" />
        ) : alerts.length === 0 ? (
          <p className="text-white/30 text-xs">All clear</p>
        ) : (
          <div className="space-y-2.5">
            {alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${severityDot[alert.severity]}`} />
                <p className="text-white/55 text-xs leading-relaxed">{alert.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Action */}
      <div className="border border-white/10 rounded-2xl p-4">
        <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Next Action</p>
        <p className="text-white/55 text-xs leading-relaxed mb-3">{nextActionText()}</p>
        {showActionBtn && (
          <Link href={confidence !== null && confidence < 30 ? '/onboarding/interview' : '/dashboard'}>
            <button className="w-full text-xs border border-white/15 text-white/50 py-2 rounded-lg hover:border-[#c0c0c0]/50 hover:text-white transition-colors">
              {confidence !== null && confidence < 30 ? 'Start Interview →' : 'Chat with Nova →'}
            </button>
          </Link>
        )}
      </div>

      {/* Integrations */}
      <div className="border border-white/10 rounded-2xl p-4">
        <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Integrations</p>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-5 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {connectors.slice(0, 4).map((c) => (
              <div key={c.model} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{c.isConnected ? '✅' : '❌'}</span>
                  <span className="text-white/55 text-xs">{MODEL_LABELS[c.model] || c.model}</span>
                </div>
                {!c.isConnected && (
                  <Link href="/dashboard/profile">
                    <button className="text-xs text-white/25 hover:text-white/60 transition-colors">
                      Connect
                    </button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
