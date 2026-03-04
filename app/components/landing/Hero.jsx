'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative min-h-screen bg-black flex flex-col justify-center overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Vertical accent line */}
      <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-700 to-transparent hidden lg:block" />

      <div className="relative max-w-7xl mx-auto px-8 pt-32 pb-24">
        <div
          className="transition-all duration-1000"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)' }}
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-px bg-zinc-600" />
            <span className="text-zinc-500 text-xs tracking-[0.3em] uppercase">
              Behavioral Intelligence Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-white font-light leading-[1.1] tracking-[-0.02em] mb-8"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)' }}>
            For pattern thinkers<br />
            who need<br />
            <span className="italic text-zinc-400">cognitive stability.</span>
          </h1>

          {/* Subheading */}
          <p
            className="text-zinc-400 text-lg font-light leading-relaxed max-w-xl mb-16 transition-all duration-1000 delay-200"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}
          >
            Your mind has a fingerprint. Nova learns it, holds it, and refuses to drift.
            Consistent intelligence — calibrated to how you actually think.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-6 transition-all duration-1000 delay-300"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}
          >
            <Link
              href="/onboarding/cognitive"
              className="group inline-flex items-center gap-4 bg-white text-black text-sm tracking-[0.2em] uppercase px-8 py-4 hover:bg-zinc-100 transition-colors duration-200"
            >
              Start Onboarding
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-hover:translate-x-1">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="text-zinc-500 hover:text-white text-xs tracking-[0.2em] uppercase transition-colors duration-200 flex items-center gap-2"
            >
              See how it works
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2V10M6 10L2 6M6 10L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="absolute bottom-12 left-8 right-8 max-w-7xl flex gap-12 border-t border-zinc-900 pt-8 transition-all duration-1000 delay-500"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {[
            { value: '6', label: 'Cognitive Probes' },
            { value: '∞', label: 'Adaptive Sessions' },
            { value: '1', label: 'Version of You' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-white text-2xl font-light tracking-tight mb-1">{value}</div>
              <div className="text-zinc-600 text-xs tracking-[0.15em] uppercase">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
