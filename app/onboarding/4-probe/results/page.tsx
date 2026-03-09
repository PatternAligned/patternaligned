import { requireAuth } from '@/lib/auth-guard';
import Link from 'next/link';

const LABELS: Record<string, Record<string, string>> = {
  compression: {
    dense:    'Dense — you process in layers. You want the full picture before acting.',
    sparse:   'Sparse — you strip to signal. Noise is a cost you refuse to pay.',
  },
  friction: {
    push:     'Force — when blocked, you push harder. Resistance is data, not a stop sign.',
    navigate: 'Navigate — when blocked, you route around. Speed beats force.',
  },
  execution: {
    rapid:     'Rapid — you ship fast and correct in motion. Iteration is the plan.',
    deliberate: 'Deliberate — you validate before moving. Getting it right once beats fixing it twice.',
  },
  contradiction: {
    resolve: 'Resolve — you hunt for the underlying truth. Ambiguity is a temporary state.',
    hold:    'Hold — you sit with tension. Contradictions are often both true.',
  },
};

interface ProbeAnswers {
  compression: string;
  friction: string;
  execution: string;
  contradiction: string;
}

async function getLatest4ProbeAnswers(email: string): Promise<ProbeAnswers | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/behavioral/4-probe/latest?email=${encodeURIComponent(email)}`,
      { cache: 'no-store' }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.answers || null;
  } catch (error) {
    console.error('Failed to fetch 4-probe answers:', error);
    return null;
  }
}

export default async function FourProbeResults() {
  const session = await requireAuth();
  const email = session.user?.email;

  if (!email) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <p className="text-zinc-400 mb-6">Authentication error. Please sign in again.</p>
        </div>
      </div>
    );
  }

  const answers = await getLatest4ProbeAnswers(email);

  if (!answers) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <p className="text-zinc-400 mb-6">No 4-probe data found. Complete the assessment first.</p>
          <Link
            href="/onboarding/4-probe"
            className="text-xs tracking-[0.2em] uppercase text-zinc-300 hover:text-white transition-colors"
          >
            Start 4-Probe →
          </Link>
        </div>
      </div>
    );
  }

  const probes: { key: keyof ProbeAnswers; label: string }[] = [
    { key: 'compression', label: 'Compression' },
    { key: 'friction', label: 'Friction' },
    { key: 'execution', label: 'Execution' },
    { key: 'contradiction', label: 'Contradiction' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-zinc-700" />
            <span className="text-zinc-500 text-xs tracking-[0.3em] uppercase">Behavioral Snapshot</span>
          </div>
          <h1 className="text-4xl font-light tracking-tight mb-4">How you think.</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Four probes. One fingerprint. Nova has this loaded.
          </p>
        </div>

        <div className="space-y-0">
          {probes.map(({ key, label }, idx) => {
            const value = answers[key];
            const description = LABELS[key]?.[value] ?? value;

            return (
              <div
                key={key}
                className="border-t border-zinc-800 py-8 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-12"
              >
                <div className="sm:w-40 flex-shrink-0">
                  <div className="text-zinc-700 text-xs tracking-[0.3em] uppercase mb-1">
                    0{idx + 1}
                  </div>
                  <div className="text-zinc-400 text-xs tracking-[0.2em] uppercase">
                    {label}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-white text-sm font-medium tracking-wide mb-2 capitalize">
                    {value}
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="border-t border-zinc-800" />
        </div>

        <div className="mt-12 flex items-center gap-8">
          <Link
            href="/onboarding/games"
            className="inline-flex items-center gap-3 bg-white text-black text-xs tracking-[0.2em] uppercase px-8 py-4 hover:bg-zinc-100 transition-colors"
          >
            Continue to Behavioral Games
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
            </svg>
          </Link>
          <Link
            href="/onboarding/4-probe"
            className="text-zinc-600 hover:text-zinc-300 text-xs tracking-[0.2em] uppercase transition-colors"
          >
            Retake
          </Link>
        </div>
      </div>
    </div>
  );
}