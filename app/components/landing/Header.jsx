'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-black/95 border-b border-zinc-800' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="text-white text-sm font-medium tracking-[0.15em]">
            PatternAligned
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          <a href="#how-it-works" className="text-zinc-500 hover:text-white text-xs tracking-[0.15em] uppercase transition-colors duration-200">
            How It Works
          </a>
          <a href="#why" className="text-zinc-500 hover:text-white text-xs tracking-[0.15em] uppercase transition-colors duration-200">
            Why
          </a>
        </nav>

        <div className="md:hidden" />
      </div>
    </header>
  );
}
