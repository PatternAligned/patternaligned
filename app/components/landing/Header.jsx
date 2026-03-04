'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import PALogo from './PALogo';

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
        <Link href="/" className="flex items-center gap-3">
          {/* Use PA-512.png if available, else fallback to SVG mark */}
          <div className="w-7 h-7 relative flex items-center justify-center">
            <Image
              src="/PA-512.png"
              alt="PatternAligned"
              width={28}
              height={28}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <span className="text-white text-sm font-medium tracking-[0.15em] uppercase">
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

        {/* Mobile: just the logo text, no buttons */}
        <div className="md:hidden" />
      </div>
    </header>
  );
}
