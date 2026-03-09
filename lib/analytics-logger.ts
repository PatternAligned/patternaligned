import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function logEvent(
  eventType: string,
  eventData: any,
  sessionId: string,
  options?: {
    modelUsed?: string;
    latencyMs?: number;
    behavioralContext?: any;
    userCorrection?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return;

  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_RENDER_BACKEND_URL}/analytics/log`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          eventType,
          eventData,
          sessionId,
          ...options,
        }),
      }
    );
  } catch (error) {
    console.error("Analytics logging failed:", error);
  }
}