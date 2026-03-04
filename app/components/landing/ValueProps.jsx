'use client';
import { useEffect, useRef, useState } from 'react';

const values = [
  {
    index: '01',
    title: 'What it does',
    headline: 'Maps your cognitive architecture.',
    body: 'PatternAligned builds a precision fingerprint of how you think — not personality type, not MBTI, not a vibe. The actual mechanics: your risk tolerance, cognitive pace, communication register, and activation pattern.',
  },
  {
    index: '02',
    title: 'Why it matters',
    headline: 'AI should be consistent, not random.',
    body: 'Every new chat session, every model reset, every "as an AI" disclaimer resets your working context to zero. Your behavioral fingerprint should be durable infrastructure — not something you rebuild every Monday.',
  },
  {
    index: '03',
    title: 'The outcome',
    headline: 'Nova evolves with you, not against you.',
    body: 'The longer you use PatternAligned, the more precisely Nova understands your cognitive state. It adjusts depth, tone, and cadence in real time — so you get leverage, not friction.',
  },
];

function ValueCard({ item, delay }) {
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
    <div
      ref={ref}
      className="border-t border-zinc-800 pt-10 pb-12 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-16">
        {/* Left: number + label */}
        <div className="lg:w-48 flex-shrink-0">
          <div className="text-zinc-700 text-xs tracking-[0.3em] uppercase mb-1">{item.index}</div>
          <div className="text-zinc-500 text-xs tracking-[0.2em] uppercase">{item.title}</div>
        </div>

        {/* Right: content */}
        <div className="flex-1">
          <h3 className="text-white text-2xl font-light tracking-tight mb-5 leading-snug">
            {item.headline}
          </h3>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl">
            {item.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ValueProps() {
  return (
    <section id="why" className="bg-black py-32 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-20">
          <div className="w-8 h-px bg-zinc-700" />
          <span className="text-zinc-500 text-xs tracking-[0.3em] uppercase">Why it exists</span>
        </div>

        <h2 className="text-white text-4xl font-light tracking-tight mb-20 max-w-lg">
          Built for people who<br />think in systems.
        </h2>

        <div>
          {values.map((item, idx) => (
            <ValueCard key={item.index} item={item} delay={idx * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
