'use client';
import { useState } from 'react';

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || state === 'loading') return;

    setState('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState('success');
        setEmail('');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        <span className="text-zinc-300 text-sm tracking-wide">You're on the list.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={state === 'loading'}
        className="flex-1 bg-transparent border border-zinc-700 text-white text-sm
          placeholder-zinc-600 px-5 py-3.5 outline-none
          focus:border-zinc-400 transition-colors duration-200
          disabled:opacity-40"
      />
      <button
        type="submit"
        disabled={state === 'loading' || !email.trim()}
        className="border border-l-0 border-zinc-700 bg-transparent text-zinc-300
          hover:bg-white hover:text-black hover:border-white
          text-xs tracking-[0.2em] uppercase px-6 py-3.5
          transition-all duration-200 disabled:opacity-40
          disabled:cursor-not-allowed whitespace-nowrap sm:border-l-0"
      >
        {state === 'loading' ? '—' : 'Join Waitlist'}
      </button>
      {state === 'error' && (
        <p className="text-zinc-500 text-xs mt-2 sm:absolute sm:mt-14 tracking-wide">
          Something went wrong. Try again.
        </p>
      )}
    </form>
  );
}
