'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface NovaChatAreaProps {
  sessionId?: string;
  projectId?: string;
  initialMessage?: string;
  activeModel?: string;
}

export default function NovaChatArea({ sessionId, projectId, initialMessage, activeModel }: NovaChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || '');
  const [modelUsed, setModelUsed] = useState(activeModel || 'Claude');
  const [modelOverride, setModelOverride] = useState<string | undefined>(undefined);
  const [availableModels, setAvailableModels] = useState<string[]>(['Claude']);
  const [sessionTitle, setSessionTitle] = useState<string | undefined>(undefined);
  const [projectName, setProjectName] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset when session/project changes
  useEffect(() => {
    setMessages([]);
    setCurrentSessionId(sessionId || '');
    setSessionTitle(undefined);
  }, [sessionId, projectId]);

  // Fetch project name
  useEffect(() => {
    if (!projectId) { setProjectName(undefined); return; }
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => {
        const p = (d.projects || []).find((p: any) => p.id === projectId);
        if (p) setProjectName(p.name);
      })
      .catch(() => {});
  }, [projectId]);

  // Fetch connected models for dropdown
  useEffect(() => {
    fetch('/api/connectors/list')
      .then((r) => r.json())
      .then((data: any[]) => {
        const connected = data.filter((m) => m.isConnected).map((m) => m.model as string);
        setAvailableModels(['Claude', ...connected.filter((m) => m !== 'claude')]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const headerTitle = sessionTitle || projectName || (sessionId ? 'Chat' : 'Nova');

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    // Set session title from first message
    if (!sessionTitle && !sessionId) setSessionTitle(text.slice(0, 50));

    try {
      const res = await fetch('/api/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          session_id: currentSessionId || undefined,
          project_id: projectId || undefined,
          override_model: modelOverride || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      if (data.session_id && !currentSessionId) setCurrentSessionId(data.session_id);
      if (data.modelUsed) setModelUsed(data.modelUsed);

      setMessages([...nextMessages, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages([...nextMessages, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#333] shrink-0">
        <span className="text-white text-sm font-medium truncate">{headerTitle}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 border border-[#333] px-2 py-0.5 rounded-full">
            {modelUsed}
          </span>
          {availableModels.length > 1 && (
            <select
              value={modelOverride || ''}
              onChange={(e) => setModelOverride(e.target.value || undefined)}
              className="bg-black text-white/40 border border-[#333] text-xs px-2 py-0.5 rounded-full focus:outline-none focus:border-[#c0c0c0]/40"
            >
              <option value="">Claude ▼</option>
              {availableModels.filter((m) => m !== 'Claude').map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-20">
            <div className="text-4xl mb-3 text-white/30">◈</div>
            <p className="text-sm text-white/30">Nova is ready. What are you working on?</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-white text-black rounded-br-sm'
                  : 'text-white/80 rounded-bl-sm'
              }`}
              style={msg.role === 'assistant' ? { backgroundColor: '#1a1a1a' } : undefined}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[#333] px-5 py-4 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message Nova..."
            rows={1}
            className="flex-1 bg-black border border-[#c0c0c0]/30 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#c0c0c0]/60 resize-none max-h-36"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 144)}px`;
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-white text-black hover:bg-white/90 disabled:opacity-30 rounded-xl px-5 py-3 text-sm font-medium transition-colors shrink-0"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-white/20 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
