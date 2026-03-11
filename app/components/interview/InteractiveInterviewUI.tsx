'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface InterviewTurn {
  probe: string;
  question: string;
  answer?: string;
}

export default function InteractiveInterviewUI() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && !sessionId) startInterview();
  }, [status, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading, isComplete]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/behavioral/interview/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': session?.user?.email || '' },
        }
      );
      if (!res.ok) throw new Error('Failed to start interview');
      const data = await res.json();
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setTurns([{ probe: data.probe, question: data.question }]);
    } catch {
      alert('Failed to start interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !sessionId) return;

    const answer = userAnswer;
    setUserAnswer('');
    setLoading(true);

    // Immediately show answer in chat
    const newTurns = [...turns];
    newTurns[newTurns.length - 1] = { ...newTurns[newTurns.length - 1], answer };
    setTurns(newTurns);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/behavioral/interview/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': session?.user?.email || '' },
          body: JSON.stringify({ sessionId, answer }),
        }
      );
      if (!res.ok) throw new Error('Failed to submit answer');
      const data = await res.json();

      if (data.isComplete) {
        await completeInterview();
      } else {
        setTurns([...newTurns, { probe: data.nextProbe, question: data.nextQuestion }]);
        setCurrentQuestion(data.nextQuestion);
      }
    } catch {
      alert('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeInterview = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/behavioral/interview/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': session?.user?.email || '' },
          body: JSON.stringify({ sessionId }),
        }
      );
      if (!res.ok) throw new Error('Failed to complete interview');
      const data = await res.json();
      setInsights(data.claudeInsights);
      setIsComplete(true);
    } catch {
      alert('Failed to synthesize insights. Please try again.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-8 py-12">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <p className="text-white/25 text-xs uppercase tracking-widest mb-3">PatternAligned</p>
          <h1 className="text-3xl font-light mb-2">Cognitive Fingerprint</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            Answer thoroughly and honestly — the more detail you provide, the better Nova learns your tone, vibe, interaction style, and decision-making pattern.
          </p>
        </div>

        {/* Chat scroll area */}
        <div className="border border-white/8 rounded-2xl p-5 sm:p-7 mb-6 min-h-[320px] max-h-[520px] overflow-y-auto flex flex-col gap-5" style={{ backgroundColor: '#0a0a0a' }}>
          {turns.map((turn, idx) => (
            <div key={idx} className="flex flex-col gap-4">
              {/* Nova question */}
              <div>
                <div className="text-white/25 text-xs mb-2">Nova</div>
                <div className="border border-white/8 rounded-xl p-4 text-sm text-white/80 leading-relaxed bg-white/[0.02]">
                  {turn.question}
                </div>
              </div>
              {/* User answer */}
              {turn.answer && (
                <div className="ml-6 sm:ml-10">
                  <div className="text-white/25 text-xs mb-2">You</div>
                  <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(192,192,192,0.25)', color: '#e0e0e0' }}>
                    {turn.answer}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-3 text-white/30 text-xs py-1">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Analyzing your response...</span>
            </div>
          )}

          {/* Inline completion summary */}
          {isComplete && insights && (
            <div className="mt-2">
              <div className="text-white/25 text-xs mb-2">Nova</div>
              <div className="border border-white/10 rounded-xl p-5 bg-white/[0.03]">
                <p className="text-white/70 text-sm leading-relaxed mb-3">{insights.overall_summary}</p>
                <div className="flex items-center gap-2 pt-2 border-t border-white/8">
                  <div className="flex-1 bg-white/8 h-px rounded-full">
                    <div className="h-px rounded-full" style={{ width: `${(insights.confidence_score * 100).toFixed(0)}%`, backgroundColor: '#c0c0c0' }} />
                  </div>
                  <span className="text-white/25 text-xs tabular-nums shrink-0">{(insights.confidence_score * 100).toFixed(0)}% signal</span>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input form or continue button */}
        {isComplete ? (
          <button
            onClick={() => router.push('/onboarding/cognitive')}
            className="w-full py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Continue to Behavioral Games →
          </button>
        ) : (
          !loading && currentQuestion && (
            <form onSubmit={submitAnswer} className="flex flex-col gap-3">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here... Be natural and honest."
                style={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(192,192,192,0.3)', color: '#e0e0e0' }}
                className="w-full p-4 border rounded-xl resize-none focus:outline-none focus:border-white/50 transition text-sm placeholder-white/20"
                rows={4}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (userAnswer.trim()) submitAnswer(e as any);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!userAnswer.trim() || loading}
                className="py-3 bg-white text-black font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
              >
                {loading ? 'Analyzing...' : 'Submit Answer'}
              </button>
              <p className="text-white/20 text-xs text-center">⌘↵ to submit</p>
            </form>
          )
        )}

      </div>
    </div>
  );
}
