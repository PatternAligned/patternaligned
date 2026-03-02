'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PatternInsight, CorrelationResult } from '@/lib/PatternCorrelationEngine';

interface ProfileData {
  profile: Record<string, string>;
  correlationResult: CorrelationResult;
}

export default function FactsSheet({ onComplete }: { onComplete?: () => void }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    if ((session?.user as any)?.id) {
      fetchCorrelation();
    }
  }, [(session?.user as any)?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Building your behavioral profile...</div>
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

  const { profile, correlationResult } = data;
  const { insights, workStyleSynthesis, activationMatchScore, confidenceScore } = correlationResult;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Behavioral Profile</h1>
        <p className="text-gray-600">Here's how you actually work, based on your choices.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-sm font-semibold text-blue-900 mb-3">YOUR WORK STYLE</h2>
        <p className="text-base leading-relaxed text-gray-800">{workStyleSynthesis}</p>
      </div>

      {insights.filter((i) => i.type === 'synergy').length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-green-900">
            🎯 Your Strengths (Things That Amplify Each Other)
          </h2>
          <div className="space-y-4">
            {insights
              .filter((i) => i.type === 'synergy')
              .map((insight, idx) => (
                <InsightCard key={idx} insight={insight} type="synergy" />
              ))}
          </div>
        </div>
      )}

      {insights.filter((i) => i.type === 'contradiction').length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-amber-900">
            ⚡ Productive Tensions (Things That Pull in Opposite Directions)
          </h2>
          <div className="space-y-4">
            {insights
              .filter((i) => i.type === 'contradiction')
              .map((insight, idx) => (
                <InsightCard key={idx} insight={insight} type="contradiction" />
              ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">📊 Your Selections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(profile).map(([key, value]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-700 mb-1">{formatKey(key)}</div>
              <div className="text-base text-gray-900">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Activation Alignment</div>
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-gray-300 rounded-full h-8 overflow-hidden">
              <div className="bg-green-500 h-full" style={{ width: `${activationMatchScore}%` }}></div>
            </div>
            <div className="text-lg font-bold text-gray-900">{activationMatchScore}%</div>
          </div>
          <p className="text-xs text-gray-600 mt-2">How well your activation pattern matches your cognitive profile</p>
        </div>

        <div className="bg-gray-100 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Profile Confidence</div>
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-gray-300 rounded-full h-8 overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${confidenceScore}%` }}></div>
            </div>
            <div className="text-lg font-bold text-gray-900">{confidenceScore}%</div>
          </div>
          <p className="text-xs text-gray-600 mt-2">Strength of detected behavioral patterns</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => {
            if (onComplete) onComplete();
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Go to Dashboard
        </button>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200">
        <details className="cursor-pointer">
          <summary className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            🔧 Debug: Raw Insights Data
          </summary>
          <pre className="mt-4 bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify({ profile, insights, activationMatchScore, confidenceScore }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  type,
}: {
  insight: PatternInsight;
  type: 'synergy' | 'contradiction';
}) {
  const bgColor = type === 'synergy' ? 'bg-green-50' : 'bg-amber-50';
  const borderColor = type === 'synergy' ? 'border-green-200' : 'border-amber-200';
  const textColor = type === 'synergy' ? 'text-green-900' : 'text-amber-900';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className="mb-2">
        <div className="text-xs font-semibold text-gray-600 mb-1">
          {insight.attributes.map(formatKey).join(' + ')}
        </div>
      </div>
      <p className={`text-base ${textColor} mb-3 leading-relaxed`}>{insight.insight}</p>
      <div className="bg-white bg-opacity-50 rounded p-3">
        <p className="text-sm text-gray-700">
          <strong>So:</strong> {insight.implication}
        </p>
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}