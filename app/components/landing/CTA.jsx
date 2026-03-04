'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import PALogo from './PALogo';

export default function CTA() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="bg-zinc-950 border-t border-zinc-800 py-40 px-8"
    >
      <div
        className="max-w-7xl mx-auto text-center transition-all duration-1000"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)' }}
      >
        <div className="flex justify-center mb-10">
          <PALogo size={40} />
        </div>
        <h2
          className="text-white font-light tracking-tight mb-6"
          style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
        >
          This isn't for everyone.
        </h2>
        <p className="text-zinc-500 text-lg font-light max-w-lg mx-auto mb-12 leading-relaxed">
          PatternAligned is for high-agency thinkers who want AI that
          meets them — not a generic assistant pretending to.
        </p>
        <Link
          href="/onboarding/cognitive"
          className="inline-flex items-center gap-4 bg-white text-black text-sm tracking-[0.2em] uppercase px-10 py-4 hover:bg-zinc-200 transition-colors duration-200"
        >
          Begin Your Fingerprint
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
        </Link>
      </div>
    </section>
  );
}
