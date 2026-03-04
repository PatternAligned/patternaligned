'use client';
import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    number: '01',
    title: 'Cognitive Fingerprint',
    description: 'Six precision probes map how you process information, make decisions, and apply energy.',
    detail: '~8 minutes',
  },
  {
    number: '02',
    title: 'Pattern Games',
    description: 'Behavioral scenarios reveal your risk tolerance, communication style, and cognitive pace.',
    detail: 'No right answers',
  },
  {
    number: '03',
    title: 'Nova Calibration',
    description: 'Your fingerprint is loaded. Nova adapts its tone, depth, and rhythm to match yours.',
    detail: 'Instant alignment',
  },
  {
    number: '04',
    title: 'Persistent Intelligence',
    description: 'Every conversation reinforces the model. Nova never resets to generic.',
    detail: 'Evolves with you',
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="bg-black border-t border-zinc-900 py-32 px-8" ref={ref}>
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-20">
          <div className="w-8 h-px bg-zinc-700" />
          <span className="text-zinc-500 text-xs tracking-[0.3em] uppercase">Process</span>
        </div>

        <h2 className="text-white text-4xl font-light tracking-tight mb-20 max-w-lg">
          From pattern chaos<br />to cognitive clarity.
        </h2>

        {/* Steps — desktop horizontal, mobile vertical */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div className="hidden lg:block absolute top-6 left-0 right-0 h-px bg-zinc-800" />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-0">
            {steps.map((step, idx) => (
              <div
                key={step.number}
                className="relative lg:pr-12 transition-all duration-700"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${idx * 120}ms`,
                }}
              >
                {/* Step dot on the line */}
                <div className="relative flex items-center mb-8 lg:mb-10">
                  <div className={`w-3 h-3 border border-zinc-600 bg-black transition-colors duration-500 ${visible ? 'border-zinc-400' : ''}`} />
                  <span className="text-zinc-600 text-xs tracking-[0.2em] uppercase ml-4 lg:hidden">
                    {step.number}
                  </span>
                </div>

                <div className="text-zinc-700 text-xs tracking-[0.25em] uppercase mb-3 hidden lg:block">
                  {step.number}
                </div>
                <h3 className="text-white text-base font-medium tracking-wide mb-3">
                  {step.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-4">
                  {step.description}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-zinc-700" />
                  <span className="text-zinc-600 text-xs tracking-widest uppercase">
                    {step.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
