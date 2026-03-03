'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchFingerprint();
    }
  }, [session]);

  const fetchFingerprint = async () => {
    try {
      const res = await fetch(
        `https://patternaligned-api.onrender.com/api/user/${session?.user?.email}/fingerprint`,
        {
          headers: {
            'x-user-email': session?.user?.email || '',
          },
        }
      );
      const data = await res.json();
      setFingerprint(data);
    } catch (error) {
      console.error('Error fetching fingerprint:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const messageText = input;
    setLoading(true);
    const userMessage = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const response = await fetch(
        'https://patternaligned-api.onrender.com/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': session?.user?.email || '',
          },
          body: JSON.stringify({
            message: messageText,
            sessionId: `session-${Date.now()}`,
          }),
        }
      );

      const data = await response.json();
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response },
        ]);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error}` },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error processing request' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 p-6">
        <h1 className="text-2xl font-light text-white mb-2">Nova Chat</h1>
        <p className="text-silver text-sm">
          Personalized by your behavioral profile
        </p>
        {fingerprint && (
          <p className="text-xs text-white/50 mt-2">
            Confidence: {(fingerprint.confidence * 100).toFixed(0)}%
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-white/50 text-sm">
                Start a conversation with Nova
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-white/10 text-white'
                    : 'bg-white/5 text-white/90'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 px-4 py-2 rounded-lg">
              <p className="text-white/70 text-sm">Nova is thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-6">
        <form onSubmit={sendMessage} className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-all"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}