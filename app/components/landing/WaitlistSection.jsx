'use client';
import { useEffect, useRef, useState } from 'react';

export default function WaitlistSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | success | error

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || state === 'loading') return;

    setState('loading');
    try {
      const res = await fetch('/api/email-capture', {
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

  return (
    <section
      ref={ref}
      className="bg-black border-t border-zinc-900 py-40 px-8"
    >
      <div
        className="max-w-7xl mx-auto transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-16">
          {/* Left: copy */}
          <div className="max-w-lg">
            <h2 className="text-white text-4xl font-light tracking-tight leading-snug mb-5">
              Join our waitlist.
            </h2>
            <p className="text-zinc-300 text-sm leading-relaxed">
              PatternAligned onboards systematically. Currently has a waitlist.
            </p>
          </div>

          {/* Right: form */}
          <div className="lg:w-[480px] flex-shrink-0">
            {state === 'success' ? (
              <div className="border border-zinc-800 p-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1.5 h-1.5 bg-zinc-400" />
                  <span className="text-zinc-300 text-sm tracking-wide">You're on the list.</span>
                </div>
                <p className="text-zinc-600 text-xs tracking-wide leading-relaxed">
                  We'll reach out when early access opens.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={state === 'loading'}
                    className="flex-1 bg-transparent border border-zinc-700 text-white text-sm
                      placeholder-zinc-600 px-6 py-4 outline-none
                      focus:border-zinc-400 transition-colors duration-200
                      disabled:opacity-40"
                  />
                  <button
                    type="submit"
                    disabled={state === 'loading' || !email.trim()}
                    className="border border-l-0 border-zinc-700
                      text-xs tracking-[0.2em] uppercase px-7 py-4 whitespace-nowrap
                      text-zinc-300
                      hover:bg-white hover:text-black hover:border-white
                      transition-all duration-200
                      disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {state === 'loading' ? (
                      <span className="flex gap-1 items-center justify-center">
                        <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : 'Notify Me'}
                  </button>
                </div>

                {state === 'error' && (
                  <p className="text-zinc-600 text-xs tracking-wide mt-3">
                    Something went wrong. Try again.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
