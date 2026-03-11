'use client';

import { useEffect, useRef, useState } from 'react';
import type { TimelineDay } from '@/app/api/nova/timeline/route';

interface TimelineData {
  days: TimelineDay[];
  summary: {
    totalActivity: number;
    totalGoals: number;
    latestConfidence: number | null;
    activeDays: number;
  };
}

interface TooltipState {
  x: number;
  y: number;
  day: TimelineDay;
}

const W = 480;
const H = 120;
const PAD = { top: 12, right: 12, bottom: 24, left: 28 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function normalize(values: (number | null)[], max: number): (number | null)[] {
  return values.map((v) => (v === null ? null : max === 0 ? 0 : v / max));
}

function buildPath(normed: (number | null)[], n: number): string {
  const pts: string[] = [];
  normed.forEach((v, i) => {
    if (v === null) return;
    const x = PAD.left + (i / (n - 1)) * INNER_W;
    const y = PAD.top + INNER_H - v * INNER_H;
    pts.push(pts.length === 0 ? `M${x},${y}` : `L${x},${y}`);
  });
  return pts.join(' ');
}

const SERIES = [
  { key: 'activity' as keyof TimelineDay, color: '#60a5fa', label: 'Activity', dash: '' },
  { key: 'goals' as keyof TimelineDay, color: '#34d399', label: 'Goals', dash: '' },
  { key: 'confidence' as keyof TimelineDay, color: '#a78bfa', label: 'Confidence', dash: '4,3' },
];

export default function PatternTimeline({ onAskNova }: { onAskNova?: (prompt: string) => void }) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch('/api/nova/timeline')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Pattern Timeline</div>
        <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || data.days.every((d) => d.activity === 0 && d.goals === 0 && d.confidence === null)) {
    return (
      <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Pattern Timeline</div>
        <div className="h-28 flex items-center justify-center">
          <p className="text-white/20 text-xs text-center">No data yet.<br />Start a session to build your timeline.</p>
        </div>
      </div>
    );
  }

  const { days, summary } = data;
  const n = days.length;

  const maxActivity = Math.max(...days.map((d) => d.activity), 1);
  const maxGoals = Math.max(...days.map((d) => d.goals), 1);

  const normedActivity = normalize(days.map((d) => d.activity), maxActivity);
  const normedGoals = normalize(days.map((d) => d.goals), maxGoals);
  const normedConfidence = normalize(
    days.map((d) => d.confidence),
    100
  );

  const pathActivity = buildPath(normedActivity, n);
  const pathGoals = buildPath(normedGoals, n);
  const pathConfidence = buildPath(normedConfidence, n);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = svgX - PAD.left;
    const idx = Math.max(0, Math.min(n - 1, Math.round((relX / INNER_W) * (n - 1))));
    const day = days[idx];
    setTooltip({ x: PAD.left + (idx / (n - 1)) * INNER_W, y: PAD.top, day });
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!tooltip || !onAskNova) return;
    const d = tooltip.day;
    const hasSomething = d.activity > 0 || d.goals > 0;
    if (!hasSomething) return;
    onAskNova(
      `On ${d.date}, I had ${d.activity} events and ${d.goals} goal interactions${d.confidence !== null ? `, and my confidence was ${d.confidence}%` : ''}. What patterns do you see here?`
    );
  };

  // X-axis labels (every ~7 days)
  const xLabels = days
    .filter((_, i) => i === 0 || i === n - 1 || i % 7 === 0)
    .map((d, _, arr) => ({
      date: d.date,
      label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      idx: days.indexOf(d),
    }));

  return (
    <div className="border border-white/10 rounded-2xl p-6 bg-white/3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40 mb-0.5">Pattern Timeline</div>
          <div className="text-white/20 text-xs">30 days · hover to inspect · click to ask Nova</div>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 mb-4">
        <Pill label="Active days" value={String(summary.activeDays)} />
        <Pill label="Events" value={String(summary.totalActivity)} />
        <Pill label="Goal hits" value={String(summary.totalGoals)} />
        {summary.latestConfidence !== null && (
          <Pill label="Confidence" value={`${summary.latestConfidence}%`} highlight />
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative" onMouseLeave={() => setTooltip(null)}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PAD.left} y1={PAD.top + INNER_H - f * INNER_H}
              x2={PAD.left + INNER_W} y2={PAD.top + INNER_H - f * INNER_H}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
          ))}

          {/* Y-axis baseline */}
          <line
            x1={PAD.left} y1={PAD.top + INNER_H}
            x2={PAD.left + INNER_W} y2={PAD.top + INNER_H}
            stroke="rgba(255,255,255,0.12)" strokeWidth="1"
          />

          {/* Lines */}
          {pathActivity && (
            <path d={pathActivity} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          )}
          {pathGoals && (
            <path d={pathGoals} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          )}
          {pathConfidence && (
            <path d={pathConfidence} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          )}

          {/* Tooltip crosshair */}
          {tooltip && (
            <>
              <line
                x1={tooltip.x} y1={PAD.top}
                x2={tooltip.x} y2={PAD.top + INNER_H}
                stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3,2"
              />
              {/* Dots on lines at hover */}
              {normedActivity[days.indexOf(tooltip.day)] !== null && (
                <circle
                  cx={tooltip.x}
                  cy={PAD.top + INNER_H - (normedActivity[days.indexOf(tooltip.day)] as number) * INNER_H}
                  r="3" fill="#60a5fa"
                />
              )}
              {normedGoals[days.indexOf(tooltip.day)] !== null && (
                <circle
                  cx={tooltip.x}
                  cy={PAD.top + INNER_H - (normedGoals[days.indexOf(tooltip.day)] as number) * INNER_H}
                  r="3" fill="#34d399"
                />
              )}
              {normedConfidence[days.indexOf(tooltip.day)] !== null && (
                <circle
                  cx={tooltip.x}
                  cy={PAD.top + INNER_H - (normedConfidence[days.indexOf(tooltip.day)] as number) * INNER_H}
                  r="3" fill="#a78bfa"
                />
              )}
            </>
          )}

          {/* X-axis labels */}
          {xLabels.map(({ label, idx }) => (
            <text
              key={label}
              x={PAD.left + (idx / (n - 1)) * INNER_W}
              y={H - 4}
              textAnchor="middle"
              fontSize="8"
              fill="rgba(255,255,255,0.25)"
            >
              {label}
            </text>
          ))}
        </svg>

        {/* Tooltip box */}
        {tooltip && (
          <div
            className="absolute top-0 pointer-events-none z-10 bg-gray-900 border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl"
            style={{
              left: `${Math.min((tooltip.x / W) * 100, 65)}%`,
              transform: 'translateX(-50%)',
              minWidth: '140px',
            }}
          >
            <div className="text-white/50 mb-1.5 font-mono">
              {new Date(tooltip.day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-blue-400">Events</span>
                <span className="text-white">{tooltip.day.activity}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-green-400">Goals</span>
                <span className="text-white">{tooltip.day.goals}</span>
              </div>
              {tooltip.day.confidence !== null && (
                <div className="flex justify-between gap-4">
                  <span className="text-purple-400">Confidence</span>
                  <span className="text-white">{tooltip.day.confidence}%</span>
                </div>
              )}
            </div>
            {onAskNova && (tooltip.day.activity > 0 || tooltip.day.goals > 0) && (
              <div className="mt-2 pt-2 border-t border-white/10 text-white/30">
                Click to ask Nova
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <svg width="16" height="8">
              <line
                x1="0" y1="4" x2="16" y2="4"
                stroke={s.color} strokeWidth="1.5"
                strokeDasharray={s.dash || undefined}
              />
            </svg>
            <span className="text-xs text-white/30">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`text-center px-3 py-1.5 rounded-lg border ${highlight ? 'border-purple-500/30 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
      <div className={`text-sm font-medium ${highlight ? 'text-purple-300' : 'text-white/80'}`}>{value}</div>
      <div className="text-xs text-white/30">{label}</div>
    </div>
  );
}
