'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface NovaCalibrationProps {
  onComplete: (selfRating?: number) => void;
  onBack?: () => void;
  projectId?: string;
}

export default function NovaCalibration({ onComplete, onBack, projectId }: NovaCalibrationProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "What should I improve understanding on? And what percentage accuracy would you rate my profile right now — 0 being completely wrong, 100 being perfect?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [showRatingInput, setShowRatingInput] = useState(false);
  const [ratingInput, setRatingInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);

    // Extract self-rating from message if numeric mention found
    const ratingMatch = userMsg.match(/\b([0-9]{1,3})\b/);
    const extractedRating = ratingMatch ? parseInt(ratingMatch[1], 10) : undefined;
    const ratingToSend = extractedRating !== undefined && extractedRating >= 0 && extractedRating <= 100
      ? extractedRating
      : selfRating ?? undefined;

    if (ratingToSend !== undefined && selfRating === null) {
      setSelfRating(ratingToSend);
    }

    const endpoint = projectId ? `/api/projects/${projectId}/calibrate` : '/api/profile/calibrate';
    const history = newMessages.slice(0, -1);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history,
          selfRating: ratingToSend,
        }),
      });
      const data = await res.json();
      const assistantText = data.response || data.message || data.nova_response || '';
      const updatedMessages: Message[] = [...newMessages, { role: 'assistant', content: assistantText }];
      setMessages(updatedMessages);

      const newTurnCount = turnCount + 1;
      setTurnCount(newTurnCount);

      const triggersRatingInput =
        /does this feel more accurate/i.test(assistantText) || newTurnCount >= 3;
      if (triggersRatingInput) {
        setShowRatingInput(true);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Something went wrong. Try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingConfirm = () => {
    const parsed = parseInt(ratingInput, 10);
    const finalRating = !isNaN(parsed) && parsed >= 0 && parsed <= 100 ? parsed : selfRating ?? undefined;
    onComplete(finalRating ?? undefined);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div
        className="border-b border-white/10 px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-white/30 text-sm hover:text-white/60 transition-colors mr-2"
            >
              ← Back
            </button>
          )}
          <div>
            <p className="text-white/30 text-xs uppercase tracking-widest">Nova</p>
            <p className="text-white text-sm font-light mt-0.5">Calibrating with Nova</p>
          </div>
        </div>
        <button
          onClick={() => onComplete(selfRating ?? undefined)}
          className="text-white/30 text-sm hover:text-white/60 transition-colors"
        >
          Skip →
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <div className="max-w-2xl mx-auto w-full space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'text-[#e0e0e0]'
                    : 'border border-white/8 text-white/80 bg-white/[0.02]'
                }`}
                style={
                  msg.role === 'user'
                    ? { backgroundColor: '#1a1a1a', border: '1px solid rgba(192,192,192,0.25)' }
                    : {}
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="border border-white/8 rounded-xl px-4 py-3 bg-white/[0.02]">
                <div className="flex gap-1">
                  <div
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          {showRatingInput && !loading && (
            <div className="pt-4 border-t border-white/8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
                Final accuracy rating (0–100)
              </p>
              <div className="flex gap-3 mb-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={ratingInput}
                  onChange={(e) => setRatingInput(e.target.value)}
                  placeholder={selfRating !== null ? String(selfRating) : '0–100'}
                  className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid rgba(192,192,192,0.25)',
                    color: '#e0e0e0',
                  }}
                />
              </div>
              <button
                onClick={handleRatingConfirm}
                className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-white/90 transition-colors text-sm"
              >
                Does this feel accurate now? → Go to workspace
              </button>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="border-t border-white/10 px-6 py-4"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <div className="max-w-2xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Tell Nova what to refine..."
            rows={2}
            className="flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none placeholder-white/30"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(192,192,192,0.25)',
              color: '#e0e0e0',
            }}
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
