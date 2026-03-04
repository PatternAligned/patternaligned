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
    title: 'Behavioral Mapping',
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
    <section id="how-it-works" className="bg-black border-t border-zinc-900 py-40 px-8" ref={ref}>
      <div className="max-w-7xl mx-auto">
        {/* Section label */}
        <div className="mb-24">
          <span className="text-white text-sm tracking-[0.4em] uppercase font-medium">Process</span>
        </div>

        {/* Steps — desktop horizontal, mobile vertical */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 lg:gap-12">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${idx * 120}ms`,
              }}
            >
              <div className="text-white text-2xl font-light tracking-[0.15em] mb-8">
                {step.number}
              </div>
              <h3 className="text-white text-base font-medium tracking-wide mb-4">
                {step.title}
              </h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                {step.description}
              </p>
              <span className="text-zinc-500 text-xs tracking-[0.2em] uppercase">
                {step.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
