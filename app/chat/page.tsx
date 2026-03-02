'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    reasoningDepth?: number;
    decisionVelocity?: string;
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          previousContext: messages.map((m) => `${m.role}: ${m.content}`).join('\n'),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          metadata: data.metadata,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${data.error || 'Unknown error'}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #333', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Nova Chat</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#888' }}>Powered by Claude Haiku/Sonnet</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
            <p>Start a conversation with Nova</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              gap: '10px',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: message.role === 'user' ? '#2563eb' : '#1f2937',
                wordWrap: 'break-word',
              }}
            >
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
              {message.metadata && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#aaa', borderTop: '1px solid #444', paddingTop: '8px' }}>
                  <p style={{ margin: '2px 0' }}>Model: {message.metadata.modelUsed}</p>
                  <p style={{ margin: '2px 0' }}>Tokens: {message.metadata.tokensUsed}</p>
                  <p style={{ margin: '2px 0' }}>Depth: {message.metadata.reasoningDepth}/10</p>
                  <p style={{ margin: '2px 0' }}>Velocity: {message.metadata.decisionVelocity}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#888', animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#888', animation: 'pulse 1.5s infinite 0.2s' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#888', animation: 'pulse 1.5s infinite 0.4s' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #444',
              backgroundColor: '#1f2937',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: loading || !input.trim() ? '#444' : '#2563eb',
              color: '#fff',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}