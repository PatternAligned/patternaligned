'use client';

// PatternAligned branding: ONLY P & A capitalized, never full caps — remove uppercase class

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Message {
  role: 'nova' | 'user';
  content: string;
}

export default function InterviewChat({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack?: () => void;
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Kick off the interview with Nova's opening message
  useEffect(() => {
    if (initialized || !(session?.user as any)?.id) return;
    setInitialized(true);
    initInterview();
  }, [(session?.user as any)?.id]);

  async function initInterview() {
    setLoading(true);
    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'begin', history: [] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.session_id) setSessionId(data.session_id);
      setConfidence(data.confidence || 0);
      setMessages([{ role: 'nova', content: data.message }]);
    } catch {
      setMessages([{ role: 'nova', content: "Great. Let's talk about how you actually work. When you're working on something and hit a wall — what's your first instinct?" }]);
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(userMsg: string, priorMessages: Message[]) {
    setLoading(true);
    try {
      const history = priorMessages.map((m) => ({
        role: m.role === 'nova' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history, session_id: sessionId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!sessionId && data.session_id) setSessionId(data.session_id);
      setConfidence(data.confidence || 0);
      if (data.shouldShowContinue) setShowContinue(true);
      setMessages((prev) => [...prev, { role: 'nova', content: data.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'nova', content: 'Something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');

    // Capture history before state update
    const priorMessages = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(priorMessages);
    sendReply(trimmed, priorMessages);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white px-6 py-4 flex items-center justify-between">
        <p className="text-white text-xs tracking-widest">PatternAligned · Interview</p>
        {confidence > 0 && (
          <div className="flex items-center gap-3">
            <div className="w-24 bg-white/20 rounded-full h-px">
              <div
                className="h-px rounded-full transition-all duration-500"
                style={{ width: `${confidence}%`, backgroundColor: '#c0c0c0' }}
              />
            </div>
            <span className="text-white text-xs">{confidence}% signal</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-32">
              <div className="w-px h-8 bg-white/20 animate-pulse" />
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'nova' ? (
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <span className="text-white text-xs ml-1">Nova</span>
                  <div
                    className="px-5 py-4 rounded-2xl text-sm leading-relaxed text-white border border-white"
                    style={{ backgroundColor: '#0a0a0a' }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1 items-end max-w-[80%]">
                  <span className="text-white text-xs mr-1">You</span>
                  <div className="bg-white text-black px-5 py-4 rounded-2xl text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex flex-col gap-1 max-w-[80%]">
                <span className="text-white text-xs ml-1">Nova</span>
                <div
                  className="px-5 py-4 rounded-2xl border border-white"
                  style={{ backgroundColor: '#0a0a0a' }}
                >
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Continue button — appears when confidence >= 72% */}
      {showContinue && (
        <div className="px-6 pb-2 max-w-2xl mx-auto w-full">
          <button
            onClick={onComplete}
            className="w-full bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-white/90 transition-colors text-sm"
          >
            Continue to Your Profile →
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (input.trim()) handleSubmit(e as any);
                }
              }}
              placeholder="Type your response..."
              rows={2}
              disabled={loading}
              className="flex-1 bg-transparent border border-white rounded-xl px-4 py-3 text-white text-sm placeholder-white/40 focus:outline-none resize-none disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-white text-black font-semibold px-5 py-3 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors text-sm shrink-0"
            >
              Send
            </button>
          </form>
          <p className="text-white text-xs mt-2 text-center">⌘↵ to send</p>
        </div>
      </div>

      {/* Back */}
      <div className="px-6 pb-6 max-w-2xl mx-auto w-full">
        <button onClick={onBack} className="text-white text-xs hover:text-white/60 transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );
}
