'use client';

import { useEffect, useState } from 'react';

interface Preferences {
  default_model: string;
  query_type_preferences: Record<string, string>;
  model_priority_order: string[];
}

const MODEL_OPTIONS = [
  { value: 'ollama', label: 'Ollama (Free)' },
  { value: 'claude', label: 'Claude' },
  { value: 'gpt', label: 'GPT-4o' },
  { value: 'perplexity', label: 'Perplexity' },
];

const QUERY_TYPES = [
  { key: 'code', label: 'Code' },
  { key: 'research', label: 'Research' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'writing', label: 'Writing' },
  { key: 'analysis', label: 'Analysis' },
];

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '13px',
  padding: '6px 10px',
  outline: 'none',
  cursor: 'pointer',
  minWidth: '140px',
};

export default function ModelPreferences() {
  const [prefs, setPrefs] = useState<Preferences>({
    default_model: 'ollama',
    query_type_preferences: {},
    model_priority_order: ['ollama', 'claude', 'gpt', 'perplexity'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/preferences/model')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setPrefs({
            default_model: data.default_model || 'ollama',
            query_type_preferences: data.query_type_preferences || {},
            model_priority_order: data.model_priority_order || ['ollama', 'claude', 'gpt', 'perplexity'],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/preferences/model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultModel: prefs.default_model,
          queryTypePrefs: prefs.query_type_preferences,
          modelPriorityOrder: prefs.model_priority_order,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.error || 'Save failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const updateQueryTypePref = (queryType: string, model: string) => {
    setPrefs((prev) => ({
      ...prev,
      query_type_preferences: {
        ...prev.query_type_preferences,
        [queryType]: model,
      },
    }));
  };

  if (loading) {
    return (
      <div style={{ background: '#000', color: '#c0c0c0', padding: '24px', borderRadius: '8px', fontSize: '14px' }}>
        Loading preferences…
      </div>
    );
  }

  return (
    <div style={{ background: '#000', color: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#fff', letterSpacing: '0.02em' }}>
        Model Preferences
      </h2>

      {/* Default Model */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#c0c0c0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Default Model
        </label>
        <select
          value={prefs.default_model}
          onChange={(e) => setPrefs((prev) => ({ ...prev, default_model: e.target.value }))}
          style={selectStyle}
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: '#111', color: '#fff' }}>
              {opt.label}
            </option>
          ))}
        </select>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
          Used when no query-type preference is set and no learned preference exists.
        </p>
      </div>

      {/* Query Type Routing */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#c0c0c0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Query Type Routing
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {QUERY_TYPES.map(({ key, label }) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#fff', minWidth: '90px' }}>{label}</span>
              <select
                value={prefs.query_type_preferences[key] || ''}
                onChange={(e) => updateQueryTypePref(key, e.target.value)}
                style={{ ...selectStyle, minWidth: '140px' }}
              >
                <option value="" style={{ background: '#111', color: 'rgba(255,255,255,0.4)' }}>
                  Auto (default)
                </option>
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ background: '#111', color: '#fff' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
          Nova learns from your ratings — these are your manual overrides.
        </p>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 600,
            padding: '9px 20px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>

        {saved && (
          <span style={{ fontSize: '13px', color: '#c0c0c0' }}>Saved</span>
        )}

        {error && (
          <span style={{ fontSize: '13px', color: '#ff6b6b' }}>{error}</span>
        )}
      </div>
    </div>
  );
}
