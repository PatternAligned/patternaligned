import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import InteractiveInterviewUI from '@/app/components/interview/InteractiveInterviewUI';

export default async function InterviewPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  return <InteractiveInterviewUI />;
}