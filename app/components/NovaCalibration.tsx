'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface NovaCalibrationProps {
  onComplete: (newConfidence?: number) => void;
  projectId?: string;
}

export default function NovaCalibration({ onComplete, projectId }: NovaCalibrationProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "What should I improve my understanding on? And on a scale of 0-100, how accurate would you say my current profile is?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);

    const history = newMessages.slice(0, -1);
    const endpoint = projectId ? `/api/projects/${projectId}/calibrate` : '/api/nova/chat';
    const body = projectId
      ? { message: userMsg, history }
      : { message: `[CALIBRATION] ${userMsg}`, history };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const assistantText = data.message || data.nova_response || '';
      const next = [...newMessages, { role: 'assistant' as const, content: assistantText }];
      setMessages(next);
      setTurnCount((t) => t + 1);
      if (turnCount >= 2) setShowConfirm(true);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#1a1a1a' }}>
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest">Nova Calibration</p>
          <p className="text-white text-sm font-light mt-0.5">{projectId ? 'Project context calibration' : 'Profile refinement'}</p>
        </div>
        <button onClick={() => onComplete()} className="text-white/30 text-sm hover:text-white/60 transition-colors">
          Skip →
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'text-[#e0e0e0]'
                  : 'border border-white/10 text-white/80 bg-white/[0.02]'
              }`}
              style={msg.role === 'user' ? { backgroundColor: '#1a1a1a', border: '1px solid #c0c0c0' } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="border border-white/10 rounded-xl px-4 py-3 bg-white/[0.02]">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {showConfirm && !loading && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onComplete()}
              className="flex-1 border border-white/15 text-white/60 py-2.5 rounded-xl text-sm hover:border-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black transition-all"
            >
              Still needs work
            </button>
            <button
              onClick={() => onComplete(80)}
              className="flex-1 bg-white text-black font-semibold py-2.5 rounded-xl text-sm hover:bg-white/90 transition-colors"
            >
              Feels accurate → Continue
            </button>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-6 py-4" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Tell Nova what to refine..."
            rows={2}
            className="flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition placeholder-white/30"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #c0c0c0', color: '#e0e0e0' }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-white text-black font-semibold px-5 rounded-xl disabled:opacity-40 hover:bg-white/90 transition-colors text-sm self-end py-3"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
