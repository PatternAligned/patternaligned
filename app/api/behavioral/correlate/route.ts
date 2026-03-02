export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/08-supabase-client";
import { correlatePatterns } from "@/lib/PatternCorrelationEngine";

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Correlate: Starting...");
    
    const session = await getServerSession(authOptions);
    console.log("🔍 Correlate: Session:", session?.user?.email);

    if (!session?.user || !(session.user as any)?.id) {
      console.log("🔍 Correlate: No session/user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    console.log("🔍 Correlate: userId =", userId);

    const { data: events, error } = await supabaseServer
      .from("behavioral_events")
      .select("*")
      .eq("user_id", userId);

    console.log("🔍 Correlate: Events fetched:", events?.length, "Error:", error);

    if (error) {
      console.error("🔍 Correlate: Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch behavioral data" },
        { status: 500 }
      );
    }

    const profile: Record<string, string> = {};
    events?.forEach((event) => {
      if (event.event_type === "game_event" && event.metadata) {
        const game = event.metadata.game;
        const metadata = event.metadata;

        switch (game) {
          case "curiosity_vector":
            if (metadata.topic_choice) profile.topic_preference = metadata.topic_choice;
            break;
          case "problem_approach":
            if (metadata.approach_style) profile.problem_solving_style = metadata.approach_style;
            break;
          case "pace_rhythm":
            if (metadata.pace_preference) profile.pace_preference = metadata.pace_preference;
            break;
          case "communication_mirror":
            if (metadata.communication_style) profile.communication_style = metadata.communication_style;
            break;
          case "risk_openness":
            if (metadata.risk_tolerance) profile.risk_tolerance = metadata.risk_tolerance;
            break;
          case "energy_mood_state":
            if (metadata.energy_pattern) profile.energy_pattern = metadata.energy_pattern;
            break;
          case "relationship_model_selector":
            if (metadata.selected_mode) profile.relationship_model = metadata.selected_mode;
            break;
          case "activation_pattern_selector":
            if (metadata.activation_pattern) profile.activation_pattern = metadata.activation_pattern;
            break;
        }
      }
    });

    console.log("🔍 Correlate: Profile built:", Object.keys(profile));

    const correlationResult = correlatePatterns(profile);
    console.log("🔍 Correlate: Correlation engine complete");

    return NextResponse.json({
      success: true,
      profile,
      correlationResult,
    });
  } catch (error) {
    console.error("🔍 CORRELATE ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}