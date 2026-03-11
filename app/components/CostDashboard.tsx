'use client';

import { useEffect, useState } from 'react';

interface DailyStat {
  date: string;
  queries: number;
  cost: number;
}

interface UsageSummary {
  totalCost: number;
  totalQueries: number;
  avgLatency: number;
  costByModel: Record<string, { cost: number; queries: number }>;
  topModel: string | null;
  costThisMonth: number;
  queriesThisMonth: number;
  queriesLast30Days: DailyStat[];
}

const MODEL_LABELS: Record<string, string> = {
  ollama: 'Ollama',
  claude: 'Claude',
  gpt: 'GPT-4o',
  perplexity: 'Perplexity',
};

const ALL_MODELS = ['ollama', 'claude', 'gpt', 'perplexity'];

const WARN_THRESHOLD = 10;
const ALERT_THRESHOLD = 50;

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

export default function CostDashboard() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/usage/summary')
      .then((res) => res.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch(() => setError('Failed to load usage data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ background: '#000', color: '#c0c0c0', padding: '24px', borderRadius: '8px', fontSize: '14px' }}>
        Loading usage data…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#000', color: '#ff6b6b', padding: '24px', borderRadius: '8px', fontSize: '14px' }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const totalPaidCost = data.totalCost - (data.costByModel['ollama']?.cost || 0);
  const maxModelCost = Math.max(
    ...ALL_MODELS.map((m) => data.costByModel[m]?.cost || 0),
    0.0001
  );

  return (
    <div style={{ background: '#000', color: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#fff', letterSpacing: '0.02em' }}>
        Usage & Cost
      </h2>

      {/* Threshold warnings */}
      {data.totalCost >= ALERT_THRESHOLD && (
        <div style={{
          background: 'rgba(255,100,100,0.08)',
          border: '1px solid rgba(255,100,100,0.3)',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#ff9999',
        }}>
          Total spend has exceeded ${ALERT_THRESHOLD}. Review your model usage.
        </div>
      )}
      {data.totalCost >= WARN_THRESHOLD && data.totalCost < ALERT_THRESHOLD && (
        <div style={{
          background: 'rgba(255,200,80,0.06)',
          border: '1px solid rgba(255,200,80,0.2)',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#ffd080',
        }}>
          Heads up: total spend is approaching ${WARN_THRESHOLD}.
        </div>
      )}

      {/* Top stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Cost', value: formatCost(data.totalCost) },
          { label: 'This Month', value: formatCost(data.costThisMonth) },
          { label: 'Total Queries', value: data.totalQueries.toLocaleString() },
          { label: 'Avg Latency', value: formatLatency(data.avgLatency) },
          ...(data.topModel ? [{ label: 'Top Model', value: MODEL_LABELS[data.topModel] || data.topModel }] : []),
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '6px',
              padding: '14px 16px',
            }}
          >
            <p style={{ fontSize: '11px', color: '#c0c0c0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
              {label}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Cost breakdown by model */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '12px', color: '#c0c0c0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Cost by Model
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ALL_MODELS.map((model) => {
            const stats = data.costByModel[model] || { cost: 0, queries: 0 };
            const barWidth = maxModelCost > 0 ? (stats.cost / maxModelCost) * 100 : 0;
            const isOllama = model === 'ollama';

            return (
              <div key={model}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', color: '#fff' }}>
                    {MODEL_LABELS[model] || model}
                  </span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                    <span style={{ color: '#c0c0c0' }}>
                      {stats.queries} {stats.queries === 1 ? 'query' : 'queries'}
                    </span>
                    <span style={{ color: '#fff', fontVariantNumeric: 'tabular-nums', minWidth: '60px', textAlign: 'right' }}>
                      {isOllama ? 'Free' : formatCost(stats.cost)}
                    </span>
                  </div>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: isOllama ? '100%' : `${barWidth}%`,
                      background: isOllama ? 'rgba(192,192,192,0.3)' : 'rgba(192,192,192,0.7)',
                      borderRadius: '2px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Total row */}
          <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#c0c0c0' }}>Total (paid models)</span>
            <span style={{ fontSize: '13px', color: '#fff', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {formatCost(totalPaidCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Queries last 30 days (simplified bar chart) */}
      {data.queriesLast30Days.length > 0 && (
        <div>
          <p style={{ fontSize: '12px', color: '#c0c0c0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Queries · Last 30 Days
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '48px' }}>
            {(() => {
              const maxQ = Math.max(...data.queriesLast30Days.map((d) => d.queries), 1);
              return data.queriesLast30Days.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.queries} queries`}
                  style={{
                    flex: 1,
                    height: `${Math.max((day.queries / maxQ) * 100, 4)}%`,
                    background: 'rgba(192,192,192,0.5)',
                    borderRadius: '2px 2px 0 0',
                    minWidth: '4px',
                  }}
                />
              ));
            })()}
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', textAlign: 'right' }}>
            {data.queriesThisMonth} this month
          </p>
        </div>
      )}
    </div>
  );
}
