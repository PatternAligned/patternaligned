'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-silver animate-pulse">
          <div className="w-12 h-12 border-2 border-silver border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-white/3 rounded-full blur-3xl opacity-10"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-20">
          <div>
            <h1 className="text-5xl font-light tracking-tight text-white mb-2">
              PatternAligned
            </h1>
            <p className="text-silver text-sm tracking-widest uppercase opacity-70">
              Behavioral Intelligence Platform
            </p>
          </div>
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/auth/signin' })}
            className="px-6 py-2 text-sm tracking-widest uppercase text-white border border-white/30 hover:border-white/80 hover:bg-white/5 transition-all duration-300"
          >
            Exit
          </button>
        </div>

        {/* Profile Section */}
        <div className="mb-20">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-8 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-white to-silver/50 flex items-center justify-center overflow-hidden border border-white/20">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-black text-2xl font-light">
                      {session.user?.name?.[0] || 'A'}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white mb-1">
                    {session.user?.name || 'User'}
                  </h2>
                  <p className="text-silver text-sm opacity-70">
                    {session.user?.email}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-white/50 rounded-full"></span>
                    <span className="text-xs uppercase tracking-widest text-white/60">
                      Active Session
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-light text-white mb-1">—</div>
                <p className="text-silver text-xs opacity-60">Fingerprint Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main CTA - Cognitive Assessment */}
        <div className="mb-16">
          <Link href="/onboarding/cognitive">
            <div className="group cursor-pointer">
              <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl p-12 hover:border-white/40 transition-all duration-500 hover:bg-white/8 relative overflow-hidden">
                
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-3xl font-light text-white mb-2">
                        Cognitive Assessment
                      </h3>
                      <p className="text-silver text-sm opacity-70">
                        Interactive behavioral analysis through pattern recognition games
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg border border-white/30 flex items-center justify-center group-hover:border-white/60 transition-all duration-300">
                      <span className="text-white/60 group-hover:text-white transition-colors">→</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-8">
                    <div className="border-l border-white/20 pl-4 py-2">
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Duration</p>
                      <p className="text-white font-light">~15 minutes</p>
                    </div>
                    <div className="border-l border-white/20 pl-4 py-2">
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Status</p>
                      <p className="text-white font-light">Ready to Begin</p>
                    </div>
                    <div className="border-l border-white/20 pl-4 py-2">
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Insights</p>
                      <p className="text-white font-light">Behavioral Data</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Status Grid */}
        <div className="grid grid-cols-2 gap-6 mb-16">
          
          {/* Session Status */}
          <div className="backdrop-blur-xl bg-white/3 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
            <p className="text-xs uppercase tracking-widest text-white/50 mb-4">Session Data</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-silver text-sm">Provider</span>
                <span className="text-white font-light">GitHub</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-silver text-sm">Auth Strategy</span>
                <span className="text-white font-light">JWT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-silver text-sm">Verified</span>
                <span className="text-white/70 text-xs">✓</span>
              </div>
            </div>
          </div>

          {/* Platform Status */}
          <div className="backdrop-blur-xl bg-white/3 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
            <p className="text-xs uppercase tracking-widest text-white/50 mb-4">Platform Status</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-silver text-sm">Phase</span>
                <span className="text-white font-light">2 - Behavioral</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-silver text-sm">Fingerprint</span>
                <span className="text-white/70 text-sm">—</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-silver text-sm">Integration</span>
                <span className="text-white/70 text-xs">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-silver text-xs opacity-50 tracking-widest">
            PATTERNALIGNED © 2025 • BEHAVIORAL INTELLIGENCE
          </p>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700&display=swap');
        
        :root {
          --color-black: #000000;
          --color-white: #ffffff;
          --color-silver: #d4d4d8;
        }

        * {
          font-family: 'Syne', sans-serif;
        }

        .text-silver {
          color: var(--color-silver);
        }

        body {
          background-color: var(--color-black);
        }
      `}</style>
    </div>
  );
}