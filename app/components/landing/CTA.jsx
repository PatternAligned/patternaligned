'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

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
        className="max-w-3xl mx-auto text-center transition-all duration-1000"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)' }}
      >
        <div className="flex justify-center mb-12">
          <Image src="/PA-512.png" alt="PatterAligned" width={60} height={60} />
        </div>
        <h2
          className="text-white font-light tracking-tight mb-10"
          style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
        >
          This isn't for everyone.
        </h2>
        <p className="text-zinc-200 text-xl font-light leading-relaxed">
          PatterAligned is for high-agency thinkers who want AI that meets them exactly — not a generic assistant pretending to.
        </p>
      </div>
    </section>
  );
}
