export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { correlatePatterns } from '@/lib/PatternCorrelationEngine';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Keyword maps for extracting structured values from nova_dialog free-text answers
const DIALOG_EXTRACTORS: Record<string, (answer: string) => string | null> = {
  pace_rhythm: (a) => {
    const t = a.toLowerCase();
    if (/sprint|burst|intense|fast.paced|rapid/i.test(t)) return 'Sprint';
    if (/cruise|steady|sustainable|consistent/i.test(t)) return 'Cruise';
    if (/flow|rhythm|organic|own pace/i.test(t)) return 'Flow';
    if (/adapt|whatever|situational|depends/i.test(t)) return 'Adaptive';
    return null;
  },
  curiosity_vector: (a) => {
    const t = a.toLowerCase();
    if (/abstract|theor|concept|system|pattern/i.test(t)) return 'Abstract';
    if (/practical|real.world|applied|useful/i.test(t)) return 'Practical';
    if (/histor|past|origin|how it (started|came)/i.test(t)) return 'Historical';
    if (/conspir|hidden|cover.up|secret|under(lying|current)/i.test(t)) return 'Conspiracy';
    if (/personal|human|people|relationship/i.test(t)) return 'Personal';
    return null;
  },
  problem_approach: (a) => {
    const t = a.toLowerCase();
    if (/analyt|data|research|map|root cause|breakdown/i.test(t)) return 'Analytical';
    if (/gut|instinct|intuiti|feel|sense/i.test(t)) return 'Intuitive';
    if (/collaborat|team|together|others|group/i.test(t)) return 'Collaborative';
    if (/delegat|assign|right person|orchestrat/i.test(t)) return 'Delegative';
    return null;
  },
  communication_mirror: (a) => {
    const t = a.toLowerCase();
    if (/concise|brief|short|direct|bottom.line|tldr/i.test(t)) return 'Concise';
    if (/structur|framework|outline|steps|logical/i.test(t)) return 'Structured';
    if (/stor|narrative|context|full picture|explain/i.test(t)) return 'Narrative';
    if (/visual|diagram|chart|show|draw/i.test(t)) return 'Visual';
    return null;
  },
  risk_openness: (a) => {
    const t = a.toLowerCase();
    if (/conserv|careful|evidence|safe|sure/i.test(t)) return 'Conservative';
    if (/calculated|measured|weigh|balanced/i.test(t)) return 'Measured';
    if (/aggress|fast|move|bet|go for/i.test(t)) return 'Aggressive';
    if (/adapt|context|depends|situation/i.test(t)) return 'Adaptive';
    return null;
  },
  energy_mood_state: (a) => {
    const t = a.toLowerCase();
    if (/morning|early|am\b|wake/i.test(t)) return 'Morning';
    if (/afternoon|pm\b|after lunch|3pm|2pm/i.test(t)) return 'Afternoon';
    if (/flow|engaged|interest|when i.m in/i.test(t)) return 'Flow-Dependent';
    if (/consist|all day|steady|throughout/i.test(t)) return 'Consistent';
    return null;
  },
  relationship_model_selector: (a) => {
    const t = a.toLowerCase();
    if (/tool|output|just (give|get)|minimal|efficient/i.test(t)) return 'tool_mode';
    if (/partner|collaborat|together|co.think|sounding/i.test(t)) return 'partner_mode';
    if (/structur|guide|framework|tell me|direction/i.test(t)) return 'structured_guide';
    if (/socrat|question|think through|figure out|ask me/i.test(t)) return 'socratic';
    return null;
  },
  activation_pattern_selector: (a) => {
    const t = a.toLowerCase();
    if (/deep|uninterrupt|focus|block|silence|alone/i.test(t)) return 'Deep Work';
    if (/banter|rapid.fire|back.and.forth|quick|lively/i.test(t)) return 'Banter';
    if (/structur|framework|agenda|clear|organiz/i.test(t)) return 'Structured';
    if (/quiet|independent|alone|without (noise|people)/i.test(t)) return 'Quiet';
    if (/meditat|reflect|slow|process|think/i.test(t)) return 'Meditative';
    return null;
  },
};

// Maps dialog probe names to gameMeasurements keys and game event names
const PROBE_TO_PROFILE_KEY: Record<string, { profileKey: string; gameKey: string }> = {
  pace_rhythm:                  { profileKey: 'pace_preference',     gameKey: 'pace_rhythm' },
  curiosity_vector:             { profileKey: 'topic_preference',    gameKey: 'curiosity_vector' },
  problem_approach:             { profileKey: 'problem_solving_style', gameKey: 'problem_approach' },
  communication_mirror:         { profileKey: 'communication_style', gameKey: 'communication_mirror' },
  risk_openness:                { profileKey: 'risk_tolerance',      gameKey: 'risk_openness' },
  energy_mood_state:            { profileKey: 'energy_pattern',      gameKey: 'energy_mood_state' },
  relationship_model_selector:  { profileKey: 'relationship_model',  gameKey: 'relationship_model_selector' },
  activation_pattern_selector:  { profileKey: 'activation_pattern', gameKey: 'activation_pattern_selector' },
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const [eventsResult, interviewResult] = await Promise.all([
      pool.query(`SELECT * FROM behavioral_events WHERE user_id = $1 ORDER BY created_at ASC`, [userId]),
      pool.query(
        `SELECT claude_insights FROM interview_sessions
         WHERE user_id = $1 AND status = 'completed' AND claude_insights IS NOT NULL
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ),
    ]);

    // Build game measurements profile from game_event rows
    const gameMeasurements: Record<string, string> = {};
    // Track which game probes are covered (to skip dialog fills for covered ones)
    const gameCovered = new Set<string>();

    eventsResult.rows.forEach((event) => {
      if (event.event_type === 'game_event' && event.metadata) {
        const { game, ...metadata } = event.metadata;
        gameCovered.add(game);
        switch (game) {
          case 'curiosity_vector':
            if (metadata.topic_choice) gameMeasurements.topic_preference = metadata.topic_choice;
            break;
          case 'problem_approach':
            if (metadata.approach_style) gameMeasurements.problem_solving_style = metadata.approach_style;
            break;
          case 'pace_rhythm':
            if (metadata.pace_preference) gameMeasurements.pace_preference = metadata.pace_preference;
            break;
          case 'communication_mirror':
            if (metadata.communication_style) gameMeasurements.communication_style = metadata.communication_style;
            break;
          case 'risk_openness':
            if (metadata.risk_tolerance) gameMeasurements.risk_tolerance = metadata.risk_tolerance;
            break;
          case 'energy_mood_state':
            if (metadata.energy_pattern) gameMeasurements.energy_pattern = metadata.energy_pattern;
            break;
          case 'relationship_model_selector':
            if (metadata.selected_mode) gameMeasurements.relationship_model = metadata.selected_mode;
            break;
          case 'activation_pattern_selector':
            if (metadata.activation_pattern) gameMeasurements.activation_pattern = metadata.activation_pattern;
            break;
        }
      }
    });

    // Fill missing game measurements from nova_dialog answers (keyword extraction)
    // Only fills gaps — game events take precedence over dialog inferences
    const dialogFills: Record<string, string> = {};
    eventsResult.rows.forEach((event) => {
      if (event.event_type === 'nova_dialog' && event.metadata) {
        const { probe, answer } = event.metadata;
        if (!probe || !answer) return;

        const mapping = PROBE_TO_PROFILE_KEY[probe];
        if (!mapping) return;

        // Skip if a real game event already covers this probe
        if (gameCovered.has(mapping.gameKey)) return;
        // Skip if already filled by an earlier dialog event
        if (gameMeasurements[mapping.profileKey]) return;

        const extractor = DIALOG_EXTRACTORS[probe];
        if (!extractor) return;

        const extracted = extractor(answer);
        if (extracted) {
          gameMeasurements[mapping.profileKey] = extracted;
          dialogFills[mapping.profileKey] = extracted; // track what came from dialog
        }
      }
    });

    // Extract 4-probe interview profiles from claude_insights
    const interviewProfiles = interviewResult.rows[0]?.claude_insights || null;

    // Build the compounded profile for correlation engine
    const compoundedProfile: Record<string, string> = { ...gameMeasurements };
    if (interviewProfiles) {
      if (interviewProfiles.compression_profile?.preference)
        compoundedProfile.compression = interviewProfiles.compression_profile.preference;
      if (interviewProfiles.friction_profile?.preference)
        compoundedProfile.friction = interviewProfiles.friction_profile.preference;
      if (interviewProfiles.execution_profile?.preference)
        compoundedProfile.execution = interviewProfiles.execution_profile.preference;
      if (interviewProfiles.contradiction_profile?.preference)
        compoundedProfile.contradiction = interviewProfiles.contradiction_profile.preference;
    }

    const correlationResult = correlatePatterns(compoundedProfile);

    return NextResponse.json({
      success: true,
      interview_profiles: interviewProfiles,
      game_measurements: gameMeasurements,
      dialog_fills: dialogFills,          // which values came from nova_dialog (not game events)
      profile: compoundedProfile,
      correlationResult,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Correlate error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
