'use client';

import { useEffect, useState } from 'react';
import type { Observation } from '@/app/api/nova/observations/route';

const SEVERITY_STYLES = {
  alert: { bar: 'bg-red-500', bg: 'bg-red-950/40 border-red-500/30', badge: 'bg-red-500/20 text-red-300', label: 'ALERT' },
  warning: { bar: 'bg-amber-400', bg: 'bg-amber-950/30 border-amber-500/20', badge: 'bg-amber-500/20 text-amber-300', label: 'NOTICE' },
  info: { bar: 'bg-blue-500', bg: 'bg-blue-950/20 border-blue-500/15', badge: 'bg-blue-500/20 text-blue-300', label: 'INFO' },
};

const TYPE_ICONS = {
  contradiction: '⟷',
  gap: '◌',
  engagement: '◈',
  validation: '◎',
  drift: '↻',
};

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NovaObservations({ onAskNova }: { onAskNova?: (prompt: string) => void }) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/nova/observations')
      .then((r) => r.json())
      .then((d) => setObservations(d.observations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (loading) {
    return (
      <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Nova Observations</div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (observations.length === 0) {
    return (
      <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Nova Observations</div>
        <p className="text-white/30 text-sm">No observations yet. Complete more of the assessment to generate pattern reads.</p>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-0.5">Nova Observations</div>
          <div className="text-white/20 text-xs">{observations.length} active · newest first</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-xs text-white/40">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {observations.map((obs) => {
          const styles = SEVERITY_STYLES[obs.severity];
          const isExpanded = expanded.has(obs.id);

          return (
            <div key={obs.id} className={`border rounded-xl overflow-hidden ${styles.bg}`}>
              {/* Left severity bar */}
              <div className="flex">
                <div className={`w-1 flex-shrink-0 ${styles.bar}`} />
                <div className="flex-1 p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-sm">{TYPE_ICONS[obs.type]}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${styles.badge}`}>
                        {styles.label}
                      </span>
                    </div>
                    <span className="text-xs text-white/30 flex-shrink-0">{timeSince(obs.timestamp)}</span>
                  </div>

                  <p className="text-sm font-medium text-white/90 mb-1">{obs.title}</p>
                  <p className="text-xs text-white/60 leading-relaxed">{obs.body}</p>

                  {/* Footer actions */}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => toggleExpand(obs.id)}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                      {isExpanded ? '▲ Hide' : '▼ Why is Nova saying this?'}
                    </button>
                    {onAskNova && (
                      <button
                        onClick={() => onAskNova(`Explain this observation: "${obs.title}". Context: ${obs.body}`)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                      >
                        Ask Nova →
                      </button>
                    )}
                  </div>

                  {/* Expandable why */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Why Nova flagged this</div>
                      <p className="text-xs text-white/50 leading-relaxed">{obs.why}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
