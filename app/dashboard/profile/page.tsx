'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfileSummary from '@/app/components/ProfileSummary';
import NovaCalibration from '@/app/components/NovaCalibration';

export default function ProfileValidationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showCalibration, setShowCalibration] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (showCalibration) {
    return (
      <NovaCalibration
        onComplete={(selfRating?: number) => {
          fetch('/api/profile/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ validated: true, userSelfRating: selfRating }),
          }).catch(() => {
            // non-fatal
          });
          router.push('/dashboard');
        }}
        onBack={() => setShowCalibration(false)}
      />
    );
  }

  return (
    <ProfileSummary
      onAccurate={() => {
        fetch('/api/profile/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ validated: true }),
        }).catch(() => {
          // non-fatal
        });
        router.push('/dashboard');
      }}
      onRefine={() => setShowCalibration(true)}
    />
  );
}
