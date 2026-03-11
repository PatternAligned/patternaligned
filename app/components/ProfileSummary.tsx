'use client';

import { useEffect, useState } from 'react';

interface DecisionPattern {
  label: string;
  measurement: string;
  source: string;
}

interface SummarySections {
  who_you_are: string;
  how_you_decide: DecisionPattern[];
  what_you_need: string;
  confidence_explanation: string;
  next_step: string;
}

interface ProfileSummaryProps {
  onAccurate: () => void;
  onRefine: () => void;
}

export default function ProfileSummary({ onAccurate, onRefine }: ProfileSummaryProps) {
  const [sections, setSections] = useState<SummarySections | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    fetch('/api/nova/profile-summary')
      .then((r) => r.json())
      .then((data) => {
        if (!data.sections) { setNoData(true); return; }
        setSections(data.sections);
        setConfidence(data.confidence);
      })
      .catch(() => setError('Failed to load profile summary'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-px h-12 bg-white/20 mx-auto mb-6 animate-pulse" />
          <p className="text-white/30 text-xs uppercase tracking-widest">Generating your behavioral summary</p>
        </div>
      </div>
    );
  }

  if (error || noData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Profile</p>
          <p className="text-white text-lg mb-3">{error || 'No behavioral data yet.'}</p>
          <p className="text-white/40 text-sm mb-8">Complete the interview and cognitive games to generate your profile.</p>
          <button onClick={onAccurate} className="text-white/50 text-sm border border-white/20 px-6 py-2 rounded-full hover:border-white/40 transition-colors">
            Go to workspace anyway →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-14">
          <p className="text-white/25 text-xs uppercase tracking-[0.2em] mb-4">PatternAligned · Behavioral Summary</p>
          <h1 className="text-4xl font-light text-white mb-4 leading-tight">How you operate.</h1>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/8 h-px rounded-full">
              <div className="h-px rounded-full" style={{ width: `${confidence}%`, backgroundColor: '#c0c0c0' }} />
            </div>
            <span className="text-white/40 text-sm tabular-nums">{confidence}% signal</span>
          </div>
        </div>

        {/* Section 1: Who you are */}
        <div className="mb-10">
          <div className="border-l border-white/20 pl-6 py-1">
            <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Who you are</p>
            <p className="text-white text-lg font-light leading-relaxed">{sections!.who_you_are}</p>
          </div>
        </div>

        {/* Section 2: How you decide */}
        <div className="mb-10">
          <p className="text-white/25 text-xs uppercase tracking-widest mb-4">How you decide</p>
          <div className="space-y-3">
            {sections!.how_you_decide.map((pattern, i) => (
              <div key={i} className="border border-white/8 rounded-xl p-5 bg-white/[0.015]">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-1.5">{pattern.label}</p>
                    <p className="text-white/80 text-sm leading-relaxed">{pattern.measurement}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: What you need */}
        <div className="mb-10">
          <p className="text-white/25 text-xs uppercase tracking-widest mb-4">What you need from Nova</p>
          <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
            <p className="text-white/70 text-sm leading-relaxed">{sections!.what_you_need}</p>
          </div>
        </div>

        {/* Section 4: Confidence */}
        <div className="mb-10">
          <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Signal confidence</p>
          <div className="flex items-center gap-4">
            <span className="text-white text-3xl font-light tabular-nums">{confidence}</span>
            <div className="flex-1">
              <div className="bg-white/8 h-px rounded-full mb-2">
                <div className="h-px rounded-full" style={{ width: `${confidence}%`, backgroundColor: '#c0c0c0' }} />
              </div>
              <p className="text-white/30 text-xs leading-relaxed">{sections!.confidence_explanation}</p>
            </div>
          </div>
        </div>

        {/* Section 5: Next step */}
        <div className="mb-12">
          <p className="text-white/40 text-sm leading-relaxed">{sections!.next_step}</p>
        </div>

        {/* Validation buttons */}
        <div className="flex gap-4">
          <button
            onClick={onRefine}
            className="flex-1 border border-white/15 text-white/60 font-medium py-3.5 px-6 rounded-xl hover:border-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black transition-all text-sm"
          >
            Refine with Nova
          </button>
          <button
            onClick={onAccurate}
            className="flex-1 bg-white text-black font-semibold py-3.5 px-6 rounded-xl hover:bg-white/90 transition-colors text-sm"
          >
            This is accurate → Workspace
          </button>
        </div>

      </div>
    </div>
  );
}
