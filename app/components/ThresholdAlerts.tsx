'use client';

import { useEffect, useState } from 'react';
import type { Alert } from '@/app/api/nova/alerts/route';

const SEVERITY_CONFIG = {
  critical: {
    border: 'border-red-500/40',
    bg: 'bg-red-950/30',
    icon: '⚠',
    iconColor: 'text-red-400',
    badge: 'bg-red-500 text-white',
    label: 'CRITICAL',
    bar: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-950/20',
    icon: '◉',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/80 text-black',
    label: 'WARNING',
    bar: 'bg-amber-400',
  },
};

const TYPE_LABELS: Record<Alert['type'], string> = {
  confidence: 'Confidence',
  inactivity: 'Inactivity',
  correction: 'Correction',
  gap: 'Coverage Gap',
  validation: 'Validation',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function ThresholdAlerts({ onAskNova }: { onAskNova?: (prompt: string) => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/nova/alerts')
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (loading) {
    return (
      <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Threshold Alerts</div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-white/40">Threshold Alerts</div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-xs text-green-400">All clear</span>
          </div>
        </div>
        <p className="text-white/30 text-sm">No thresholds breached. Profile is in good standing.</p>
        <div className="mt-4 pt-4 border-t border-white/10">
          <ThresholdLegend />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-0.5">Threshold Alerts</div>
          <div className="text-white/20 text-xs">
            {activeAlerts.filter((a) => a.severity === 'critical').length} critical ·{' '}
            {activeAlerts.filter((a) => a.severity === 'warning').length} warnings
          </div>
        </div>
        {dismissed.size > 0 && (
          <button
            onClick={() => setDismissed(new Set())}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Restore {dismissed.size} dismissed
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeAlerts.map((alert) => {
          const cfg = SEVERITY_CONFIG[alert.severity];
          return (
            <div key={alert.id} className={`border rounded-xl overflow-hidden ${cfg.border} ${cfg.bg}`}>
              <div className={`h-1 w-full ${cfg.bar}`} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${cfg.iconColor}`}>{cfg.icon}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-white/30">{TYPE_LABELS[alert.type]}</span>
                  </div>
                  <span className="text-xs text-white/25">{timeAgo(alert.triggered_at)}</span>
                </div>

                <p className="text-sm font-medium text-white/90 mb-1">{alert.title}</p>
                <p className="text-xs text-white/50 mb-3">{alert.detail}</p>

                <div className="bg-white/5 rounded-lg p-2.5 mb-3">
                  <div className="text-xs text-white/30 mb-1">Nova suggests</div>
                  <p className="text-xs text-white/60 leading-relaxed">{alert.suggestion}</p>
                </div>

                <div className="flex gap-2">
                  {onAskNova && (
                    <button
                      onClick={() => onAskNova(`I have an alert: "${alert.title}". ${alert.detail} What should I do?`)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Ask Nova →
                    </button>
                  )}
                  <button
                    onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
                    className="text-xs text-white/25 hover:text-white/50 transition-colors ml-auto"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Threshold reference */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <ThresholdLegend />
      </div>
    </div>
  );
}

function ThresholdLegend() {
  const thresholds = [
    { label: 'Low confidence', trigger: 'Confidence < 80%', severity: 'warning' },
    { label: 'Inactivity', trigger: '7+ days no session', severity: 'warning' },
    { label: 'Repeated correction', trigger: '2+ insights rejected', severity: 'critical' },
    { label: 'Coverage gap', trigger: '5+ games missing', severity: 'critical' },
    { label: 'Validation mismatch', trigger: 'User-flagged insights', severity: 'warning' },
  ] as const;

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-white/20 mb-3">Alert Thresholds</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {thresholds.map((t) => (
          <div key={t.label} className="flex items-start gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                t.severity === 'critical' ? 'bg-red-500' : 'bg-amber-400'
              }`}
            />
            <div>
              <div className="text-xs text-white/40">{t.label}</div>
              <div className="text-xs text-white/20">{t.trigger}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
