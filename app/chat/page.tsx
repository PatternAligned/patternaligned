'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) fetchFingerprint();
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchFingerprint = async () => {
    try {
      const res = await fetch(
        `https://patternaligned-api.onrender.com/api/user/${session?.user?.email}/fingerprint`,
        { headers: { 'x-user-email': session?.user?.email || '' } }
      );
      const data = await res.json();
      setFingerprint(data);
    } catch {}
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const messageText = input;
    setMessages((prev) => [...prev, { role: 'user', content: messageText }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('https://patternaligned-api.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': session?.user?.email || '',
        },
        body: JSON.stringify({ message: messageText, sessionId: `session-${Date.now()}` }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response || data.error || 'No response' },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-1 h-6 bg-white animate-pulse" />
      </div>
    );
  }

  if (!session) return null;

  const confidence =
    fingerprint?.confidence != null && !isNaN(fingerprint.confidence)
      ? Math.round(fingerprint.confidence * 100)
      : null;

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">

      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-white text-lg font-semibold tracking-[0.15em] uppercase">Nova</h1>
            <p className="text-zinc-400 text-xs tracking-widest uppercase mt-0.5">
              Behavioral Intelligence
            </p>
          </div>
          {confidence !== null && (
            <div className="hidden sm:flex items-center gap-2 border-l border-zinc-800 pl-6">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span className="text-zinc-400 text-xs tracking-widest uppercase">
                Profile {confidence}% matched
              </span>
            </div>
          )}
        </div>
        <div className="text-zinc-600 text-xs tracking-widest uppercase">
          {session.user?.name || session.user?.email}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center px-8">
            <div className="text-center max-w-lg">
              <div className="w-px h-16 bg-zinc-700 mx-auto mb-8" />
              <p className="text-zinc-300 text-xl font-light tracking-wide mb-3">
                Ready when you are.
              </p>
              <p className="text-zinc-600 text-sm tracking-wide">
                Nova is calibrated to your behavioral profile.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-8 py-6 space-y-0">
            {messages.map((msg, idx) => (
              <div key={idx}>
                {msg.role === 'user' ? (
                  /* User message */
                  <div className="flex justify-end py-4">
                    <div className="max-w-2xl">
                      <p className="text-white text-sm tracking-wide leading-relaxed text-right">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Assistant message */
                  <div className="flex gap-6 py-6 border-b border-zinc-900 last:border-0">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-1 h-4 bg-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase mb-3">Nova</p>
                      <div className="text-zinc-200 text-sm leading-7 tracking-wide
                        prose-headings:text-white prose-headings:font-semibold prose-headings:tracking-wide
                        prose-strong:text-white prose-strong:font-semibold
                        prose-p:text-zinc-200 prose-p:leading-7
                        prose-li:text-zinc-200 prose-li:leading-7
                        prose-ul:space-y-1 prose-ol:space-y-1
                        prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
                        [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                        [&_strong]:text-white
                        [&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2
                        [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2
                        [&_h3]:text-zinc-300 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1
                        [&_ul]:list-none [&_ul]:pl-0 [&_ul]:space-y-1
                        [&_ul_li]:flex [&_ul_li]:gap-2 [&_ul_li]:before:content-['—'] [&_ul_li]:before:text-zinc-600 [&_ul_li]:before:flex-shrink-0
                        [&_ol]:pl-5 [&_ol]:space-y-1
                        [&_p]:mb-3">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-6 py-6">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-1 h-4 bg-zinc-700" />
                </div>
                <div className="flex-1">
                  <p className="text-zinc-600 text-[10px] tracking-[0.2em] uppercase mb-3">Nova</p>
                  <div className="flex gap-1.5 items-center h-5">
                    <div className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-zinc-800 px-8 py-5">
        <form onSubmit={sendMessage} className="flex items-center gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Nova..."
            disabled={loading}
            autoFocus
            className="flex-1 bg-transparent text-white placeholder-zinc-600 text-sm tracking-wide
              outline-none border-b border-zinc-700 pb-2 focus:border-zinc-400
              transition-colors duration-200 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex-shrink-0 text-zinc-400 hover:text-white disabled:opacity-20
              transition-colors duration-200 text-xs tracking-[0.2em] uppercase pb-2
              border-b border-transparent hover:border-zinc-400 disabled:hover:border-transparent"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
