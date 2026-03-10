'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface InterviewTurn {
  probe: string;
  question: string;
  answer?: string;
  timestamp?: number;
}

export default function InteractiveInterviewUI() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentProbe, setCurrentProbe] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && !sessionId) {
      startInterview();
    }
  }, [status, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns, currentQuestion]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/behavioral/interview/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': session?.user?.email || ''
          }
        }
      );

      if (!response.ok) throw new Error('Failed to start interview');

      const data = await response.json();
      setSessionId(data.sessionId);
      setCurrentProbe(data.probe);
      setCurrentQuestion(data.question);
      setTurns([{ probe: data.probe, question: data.question }]);
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !sessionId) return;

    setLoading(true);
    try {
      const newTurns = [...turns];
      newTurns[newTurns.length - 1].answer = userAnswer;
      setTurns(newTurns);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/behavioral/interview/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': session?.user?.email || ''
          },
          body: JSON.stringify({
            sessionId,
            answer: userAnswer
          })
        }
      );

      if (!response.ok) throw new Error('Failed to submit answer');

      const data = await response.json();

      if (data.isComplete) {
        completeInterview();
      } else {
        setTurns([...newTurns, { probe: data.nextProbe, question: data.nextQuestion }]);
        setCurrentProbe(data.nextProbe);
        setCurrentQuestion(data.nextQuestion);
      }

      setUserAnswer('');
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeInterview = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/behavioral/interview/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': session?.user?.email || ''
          },
          body: JSON.stringify({ sessionId })
        }
      );

      if (!response.ok) throw new Error('Failed to complete interview');

      const data = await response.json();
      setInsights(data.claudeInsights);
      setIsComplete(true);
    } catch (error) {
      console.error('Error completing interview:', error);
      alert('Failed to synthesize insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const continueToGames = () => {
    router.push('/onboarding/cognitive');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-silver/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading interview...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-light mb-2">Cognitive Fingerprint</h1>
          <p className="text-silver text-sm sm:text-base">
            Let's understand how you think. Answer a few questions naturally.
          </p>
        </div>

        <div className="bg-gray-900/30 border border-silver/20 rounded-lg p-6 sm:p-8 mb-8 h-96 sm:h-[500px] overflow-y-auto flex flex-col">
          {turns.map((turn, idx) => (
            <div key={idx} className="mb-6 flex flex-col">
              <div className="mb-4">
                <div className="text-silver text-xs mb-2 font-light">Claude</div>
                <div className="bg-silver/5 border border-silver/10 rounded p-4 text-sm sm:text-base leading-relaxed">
                  {turn.question}
                </div>
              </div>

              {turn.answer && (
                <div className="ml-8">
                  <div className="text-silver text-xs mb-2 font-light">You</div>
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded p-4 text-sm sm:text-base leading-relaxed">
                    {turn.answer}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-silver text-sm">
              <div className="w-2 h-2 bg-silver rounded-full animate-pulse"></div>
              <span>Claude is thinking...</span>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {isComplete && insights ? (
          <div className="space-y-6">
            <div className="bg-silver/5 border border-silver/20 rounded-lg p-6 sm:p-8">
              <h2 className="text-xl font-light mb-4">Your Cognitive Profile</h2>
              <p className="text-silver text-sm sm:text-base leading-relaxed mb-4">
                {insights.overall_summary}
              </p>
              <div className="text-xs text-silver/60">
                Confidence: {(insights.confidence_score * 100).toFixed(0)}%
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(insights)
                .filter(([key]) => key.endsWith('_profile'))
                .map(([key, value]: [string, any]) => (
                  <div key={key} className="border border-silver/20 rounded-lg p-4">
                    <h3 className="text-sm font-light text-silver/80 mb-2 capitalize">
                      {key.replace('_profile', '')}
                    </h3>
                    <p className="text-xs text-silver/60">
                      {value.preference}
                    </p>
                  </div>
                ))}
            </div>

            <button
              onClick={continueToGames}
              className="w-full py-3 bg-white text-black font-light rounded hover:bg-silver transition mt-8"
            >
              Continue to Behavioral Games
            </button>
          </div>
        ) : (
          !loading && currentQuestion && (
            <form onSubmit={submitAnswer} className="flex flex-col gap-4">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here... Be natural and honest."
                className="w-full p-4 bg-gray-900 border border-silver/20 rounded text-white placeholder-silver/40 resize-none focus:outline-none focus:border-silver/60 transition text-sm sm:text-base"
                rows={4}
                disabled={loading}
              />

              <button
                type="submit"
                disabled={!userAnswer.trim() || loading}
                className="py-3 bg-white text-black font-light rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-silver transition"
              >
                {loading ? 'Processing...' : 'Submit Answer'}
              </button>

              <p className="text-xs text-silver/60 text-center">
                Probes: Compression • Friction • Execution • Contradiction
              </p>
            </form>
          )
        )}
      </div>
    </div>
  );
}