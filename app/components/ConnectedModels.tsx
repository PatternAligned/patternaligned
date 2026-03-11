'use client';

import { useEffect, useState } from 'react';

interface ModelInfo {
  model: string;
  isConnected: boolean;
  apiKeyPreview: string | null;
  costThisMonth: number;
  queriesThisMonth: number;
  lastUsed: string | null;
}

interface TestResult {
  success: boolean;
  responsePreview?: string;
  latency?: number;
  cost?: number;
  error?: string;
}

const MODEL_LABELS: Record<string, string> = {
  ollama: 'Ollama',
  claude: 'Claude',
  gpt: 'GPT-4o',
  perplexity: 'Perplexity',
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  ollama: 'Self-hosted · Free',
  claude: 'Anthropic · $0.003/$0.015 per 1K tokens',
  gpt: 'OpenAI · $0.005/$0.015 per 1K tokens',
  perplexity: 'Perplexity AI · $0.002/$0.006 per 1K tokens',
};

export default function ConnectedModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingModel, setConnectingModel] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [connectError, setConnectError] = useState<Record<string, string>>({});
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ model: string; result: TestResult } | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/connectors/list');
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      }
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleConnect = async (model: string) => {
    const apiKey = model === 'ollama' ? '' : (apiKeyInputs[model] || '').trim();

    if (model !== 'ollama' && !apiKey) {
      setConnectError((prev) => ({ ...prev, [model]: 'API key is required' }));
      return;
    }

    setConnectingModel(model);
    setConnectError((prev) => ({ ...prev, [model]: '' }));

    try {
      const res = await fetch('/api/connectors/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, apiKey }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setApiKeyInputs((prev) => ({ ...prev, [model]: '' }));
        await fetchModels();
      } else {
        setConnectError((prev) => ({ ...prev, [model]: data.error || 'Connection failed' }));
      }
    } catch {
      setConnectError((prev) => ({ ...prev, [model]: 'Network error' }));
    } finally {
      setConnectingModel(null);
    }
  };

  const handleTest = async (model: string) => {
    setTestingModel(model);
    try {
      const res = await fetch('/api/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });

      const data = await res.json();
      setTestResult({ model, result: data });
      setShowTestModal(true);
    } catch {
      setTestResult({ model, result: { success: false, error: 'Network error' } });
      setShowTestModal(true);
    } finally {
      setTestingModel(null);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#000', color: '#fff', padding: '24px', borderRadius: '8px' }}>
        <p style={{ color: '#c0c0c0', fontSize: '14px' }}>Loading connectors…</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#000', color: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#fff', letterSpacing: '0.02em' }}>
        AI Model Connectors
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {models.map((m) => (
          <div
            key={m.model}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: m.isConnected ? '8px' : '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                    {MODEL_LABELS[m.model] || m.model}
                  </span>
                  {m.isConnected ? (
                    <span style={{
                      fontSize: '11px',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      letterSpacing: '0.04em',
                    }}>
                      CONNECTED
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.04em',
                    }}>
                      NOT CONNECTED
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: '#c0c0c0', marginTop: '2px' }}>
                  {MODEL_DESCRIPTIONS[m.model]}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {m.isConnected && (
                  <button
                    onClick={() => handleTest(m.model)}
                    disabled={testingModel === m.model}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#c0c0c0',
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: testingModel === m.model ? 'not-allowed' : 'pointer',
                      opacity: testingModel === m.model ? 0.5 : 1,
                    }}
                  >
                    {testingModel === m.model ? 'Testing…' : 'Test'}
                  </button>
                )}
              </div>
            </div>

            {m.isConnected && (
              <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#c0c0c0' }}>
                <span>
                  Cost this month:{' '}
                  <span style={{ color: '#fff' }}>
                    {m.model === 'ollama' ? 'Free' : `$${m.costThisMonth.toFixed(4)}`}
                  </span>
                </span>
                <span>
                  Queries:{' '}
                  <span style={{ color: '#fff' }}>{m.queriesThisMonth}</span>
                </span>
                {m.apiKeyPreview && m.model !== 'ollama' && (
                  <span>
                    Key:{' '}
                    <span style={{ color: '#fff', fontFamily: 'monospace' }}>···{m.apiKeyPreview}</span>
                  </span>
                )}
              </div>
            )}

            {!m.isConnected && (
              <div style={{ marginTop: '4px' }}>
                {m.model !== 'ollama' && (
                  <div style={{ marginBottom: '8px' }}>
                    <input
                      type="password"
                      placeholder={`Enter ${MODEL_LABELS[m.model]} API key`}
                      value={apiKeyInputs[m.model] || ''}
                      onChange={(e) =>
                        setApiKeyInputs((prev) => ({ ...prev, [m.model]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConnect(m.model);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '13px',
                        padding: '8px 12px',
                        width: '100%',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {connectError[m.model] && (
                      <p style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '4px' }}>
                        {connectError[m.model]}
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => handleConnect(m.model)}
                  disabled={connectingModel === m.model}
                  style={{
                    background: '#fff',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '8px 16px',
                    cursor: connectingModel === m.model ? 'not-allowed' : 'pointer',
                    opacity: connectingModel === m.model ? 0.7 : 1,
                  }}
                >
                  {connectingModel === m.model
                    ? 'Connecting…'
                    : m.model === 'ollama'
                    ? 'Connect Ollama'
                    : 'Connect'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Test Result Modal */}
      {showTestModal && testResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowTestModal(false)}
        >
          <div
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                Test Result — {MODEL_LABELS[testResult.model] || testResult.model}
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#c0c0c0', cursor: 'pointer', fontSize: '18px' }}
              >
                ×
              </button>
            </div>

            {testResult.result.success ? (
              <>
                <p style={{ color: '#fff', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
                  {testResult.result.responsePreview}
                </p>
                <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#c0c0c0' }}>
                  <span>Latency: <span style={{ color: '#fff' }}>{testResult.result.latency}ms</span></span>
                  <span>Cost: <span style={{ color: '#fff' }}>${(testResult.result.cost || 0).toFixed(6)}</span></span>
                </div>
              </>
            ) : (
              <p style={{ color: '#ff6b6b', fontSize: '13px' }}>
                {testResult.result.error || 'Test failed'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
