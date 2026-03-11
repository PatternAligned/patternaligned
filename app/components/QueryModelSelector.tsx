'use client';

import { useState } from 'react';

interface QueryModelSelectorProps {
  modelUsed: string;
  responseId: string;
  onModelChange: (model: string) => void;
}

const MODEL_LABELS: Record<string, string> = {
  ollama: 'Ollama',
  claude: 'Claude',
  gpt: 'GPT-4o',
  perplexity: 'Perplexity',
};

const ALL_MODELS = ['ollama', 'claude', 'gpt', 'perplexity'];

export default function QueryModelSelector({ modelUsed, responseId, onModelChange }: QueryModelSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [preferenceSaved, setPreferenceSaved] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  const handleModelSelect = (model: string) => {
    setShowDropdown(false);
    onModelChange(model);
  };

  const handleRating = async (stars: number) => {
    if (ratingLoading) return;
    setRating(stars);
    setRatingLoading(true);

    try {
      const res = await fetch('/api/nova/rate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, rating: stars }),
      });

      if (res.ok && stars >= 4) {
        setPreferenceSaved(true);
        setTimeout(() => setPreferenceSaved(false), 3000);
      }
    } catch {
      // Fail silently
    } finally {
      setRatingLoading(false);
    }
  };

  const displayRating = hoverRating ?? rating;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
      {/* Model indicator + change dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDropdown((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.45)',
            fontSize: '12px',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Nova used {MODEL_LABELS[modelUsed] || modelUsed}
          <span style={{ fontSize: '10px', opacity: 0.7 }}>· change ▾</span>
        </button>

        {showDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: '#111',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              overflow: 'hidden',
              zIndex: 100,
              minWidth: '140px',
            }}
          >
            {ALL_MODELS.map((model) => (
              <button
                key={model}
                onClick={() => handleModelSelect(model)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: model === modelUsed ? 'rgba(255,255,255,0.07)' : 'transparent',
                  border: 'none',
                  color: model === modelUsed ? '#fff' : '#c0c0c0',
                  fontSize: '13px',
                  padding: '9px 14px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    model === modelUsed ? 'rgba(255,255,255,0.07)' : 'transparent';
                }}
              >
                {MODEL_LABELS[model] || model}
                {model === modelUsed && (
                  <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>·</span>

      {/* Star rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div
          style={{ display: 'flex', gap: '2px' }}
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              disabled={ratingLoading}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: ratingLoading ? 'not-allowed' : 'pointer',
                padding: '0 1px',
                fontSize: '14px',
                color: displayRating !== null && star <= displayRating
                  ? '#fff'
                  : 'rgba(255,255,255,0.2)',
                transition: 'color 0.1s',
                lineHeight: 1,
              }}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        {preferenceSaved && (
          <span style={{ fontSize: '11px', color: '#c0c0c0', letterSpacing: '0.02em' }}>
            Preference saved
          </span>
        )}
      </div>

      {/* Close dropdown on outside click */}
      {showDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
