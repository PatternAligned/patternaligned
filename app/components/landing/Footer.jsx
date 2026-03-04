import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-zinc-900 px-8 py-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Image src="/PA-512.png" alt="PatterAligned" width={24} height={24} />
          <span className="text-zinc-600 text-xs tracking-[0.15em] uppercase">PatterAligned</span>
        </div>

        <nav className="flex flex-wrap gap-8">
          <a href="mailto:hello@patternaligned.com" className="text-zinc-600 hover:text-white text-xs tracking-[0.15em] uppercase transition-colors duration-200">
            Contact
          </a>
        </nav>

        <div className="text-zinc-700 text-xs tracking-widest uppercase">
          © {new Date().getFullYear()} PatterAligned
        </div>
      </div>
    </footer>
  );
}
