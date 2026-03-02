'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import OnboardingSequencer from '@/app/components/OnboardingSequencer';

export default function CognitivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') return <div className="bg-black min-h-screen text-white flex items-center justify-center">Loading...</div>;
  if (!session) return null;

  return (
    <div className="bg-black min-h-screen text-white">
      <OnboardingSequencer />
    </div>
  );
}