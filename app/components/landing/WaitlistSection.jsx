'use client';
import { useEffect, useRef, useState } from 'react';

export default function WaitlistSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="bg-black border-t border-zinc-900 py-32 px-8"
    >
      <div
        className="max-w-7xl mx-auto transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-px bg-zinc-700" />
          <span className="text-zinc-500 text-xs tracking-[0.3em] uppercase">Access</span>
        </div>
        <p className="text-zinc-300 text-xl font-light leading-relaxed max-w-2xl">
          PatternAligned onboards systematically. Currently has a waitlist.
        </p>
      </div>
    </section>
  );
}
