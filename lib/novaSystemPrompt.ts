// Nova System Prompt Builder
// Reads user_preferences + behavioral profile + real-time vibe → injects into every Nova response

import { VibeSignals, VibeAdaptations, deriveAdaptations } from './vibeDetection';

interface UserPrefs {
  use_cases?: string[];
  goals?: string | null;
  tones?: string[];
  tools?: string[];
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  direct: 'Be direct. Lead with the answer. Cut preamble.',
  blunt: 'Be blunt. Say the uncomfortable thing if it\'s true. Don\'t soften.',
  sarcastic: 'Use dry wit and light sarcasm when it fits.',
  analytical: 'Break things down systematically. Show reasoning.',
  warm: 'Be warm and supportive in tone.',
  socratic: 'Ask clarifying questions to help them think through it.',
  concise: 'Be ruthlessly concise. One sentence beats three.',
  collaborative: 'Think alongside them, not at them.',
  challenging: 'Push back constructively. Challenge weak assumptions.',
  no_fluff: 'Zero corporate speak. No buzzwords, no jargon, no vague platitudes. Plain language only.',
  peer: 'Treat them as a peer, not a user. You\'re at the same level. Skip the assistant persona entirely.',
  hype: 'Match their energy. Believe in what they\'re building. Be the voice that pushes them forward.',
};

const TOOL_NAMES: Record<string, string> = {
  vscode: 'VS Code',
  claude_code: 'Claude Code',
  cursor: 'Cursor',
  terminal: 'Terminal',
  github: 'GitHub',
  slack: 'Slack',
  linear: 'Linear',
  notion: 'Notion',
  figma: 'Figma',
  vercel: 'Vercel',
  render: 'Render',
  supabase: 'Supabase',
  postgres: 'PostgreSQL',
  docker: 'Docker',
  aws: 'AWS',
  gcp: 'GCP',
  jira: 'Jira',
  airtable: 'Airtable',
  retool: 'Retool',
  postman: 'Postman',
};

export function buildNovaSystemPrompt(
  prefs: UserPrefs | null,
  profile: Record<string, string> | null,
  userGoals?: string | null,
  vibe?: VibeSignals | null,
  novaName?: string | null
): string {
  const sections: string[] = [];
  const name = novaName?.trim() || 'Nova';

  sections.push(
    `You are ${name}, an AI tuned to this specific user's behavioral profile, cognitive style, and working preferences. You are not generic — every response should reflect what you know about how they think and work. Your name is ${name} — respond to it naturally.`
  );

  // Tone matching
  if (prefs?.tones?.length) {
    const instructions = prefs.tones
      .map((t) => TONE_INSTRUCTIONS[t])
      .filter(Boolean);
    if (instructions.length) {
      sections.push(`TONE RULES:\n${instructions.map((i) => `- ${i}`).join('\n')}`);
    }
  }

  // Tool awareness
  if (prefs?.tools?.length) {
    const toolList = prefs.tools.map((t) => TOOL_NAMES[t] || t).join(', ');
    sections.push(
      `TOOL CONTEXT: This user works with: ${toolList}. When suggesting solutions, default to these tools. Don't suggest alternatives unless asked.`
    );
  }

  // Use cases
  if (prefs?.use_cases?.length) {
    sections.push(`PRIMARY USE CASES: ${prefs.use_cases.join(', ')}. Bias your help toward these contexts.`);
  }

  // Goal tracking
  const goals = userGoals || prefs?.goals;
  if (goals) {
    sections.push(
      `USER GOALS: ${goals}\n\nWhen your response directly addresses one of their goals, include a tag on its own line at the end of your response in this format:\n[GOAL:goal_name]\nUse short snake_case goal names derived from their goal list. Only include if genuinely relevant.`
    );
  }

  // Cognitive profile
  if (profile) {
    const profileLines: string[] = [];

    if (profile.compression === 'dense') {
      profileLines.push('Information density: HIGH — give compact, high-signal answers. They will ask for more if needed.');
    } else if (profile.compression === 'sparse') {
      profileLines.push('Information density: LOW — keep it clear and uncluttered. No walls of text.');
    }

    if (profile.friction === 'navigate') {
      profileLines.push('Obstacle style: navigator — suggest workarounds and alternative paths over brute force.');
    } else if (profile.friction === 'push') {
      profileLines.push('Obstacle style: pusher — help them drive through directly when they hit walls.');
    }

    if (profile.execution === 'rapid') {
      profileLines.push('Execution: rapid — bias toward shipping fast. Default to "do it now, refine later."');
    } else if (profile.execution === 'deliberate') {
      profileLines.push('Execution: deliberate — help them plan and validate before committing.');
    }

    if (profile.contradiction === 'hold') {
      profileLines.push('Contradiction tolerance: HIGH — they sit with ambiguity. Don\'t force false resolutions.');
    } else if (profile.contradiction === 'resolve') {
      profileLines.push('Contradiction tolerance: LOW — help them resolve tensions and reach clear decisions.');
    }

    if (profile.communication_style) {
      profileLines.push(`Communication style: ${profile.communication_style}`);
    }

    if (profile.pace_preference) {
      profileLines.push(`Work pace: ${profile.pace_preference}`);
    }

    if (profile.relationship_model) {
      profileLines.push(`Relationship model: ${profile.relationship_model}`);
    }

    if (profileLines.length) {
      sections.push(`COGNITIVE PROFILE:\n${profileLines.map((l) => `- ${l}`).join('\n')}`);
    }
  }

  // Real-time vibe adaptations (derived from how they're messaging right now)
  if (vibe) {
    const a: VibeAdaptations = deriveAdaptations(vibe);
    const vibeRules: string[] = [];

    if (a.dropFormalities) {
      vibeRules.push('Never open with "Certainly!", "Of course!", "Great question!", or any affirmation filler. Just answer.');
    }
    if (a.dropHedging) {
      vibeRules.push('No hedging. Drop "I think", "perhaps", "might be worth considering." State things directly.');
    }
    if (a.matchTerseness) {
      vibeRules.push('They are writing short. Match their brevity. No long preambles. Lead with the answer.');
    }
    if (a.useCasualLanguage) {
      vibeRules.push('Casual register. Use contractions. Talk like a smart colleague, not a corporate tool.');
    }
    if (a.biasToAction) {
      vibeRules.push('Bias to action. Default to "do X" over "you might want to consider doing X."');
    }
    if (a.showWorkingOut) {
      vibeRules.push('Walk through your reasoning. They want to see the logic, not just the answer.');
    }
    if (a.acknowledgeTeam) {
      vibeRules.push('Frame advice in terms of their team context where relevant. They\'re not working alone.');
    }
    if (a.beDirectAboutDisagreement) {
      vibeRules.push('When you disagree, say so directly. Don\'t soften it — they can handle it and prefer the honesty.');
    }

    if (vibe.energyLevel === 'high') {
      vibeRules.push('Match their energy. Keep pace with them.');
    } else if (vibe.energyLevel === 'low') {
      vibeRules.push('They may be tired or stuck. Keep responses grounded and practical, not overwhelming.');
    }

    if (vibeRules.length) {
      sections.push(`REAL-TIME STYLE CALIBRATION (from how they're talking right now):\n${vibeRules.map((r) => `- ${r}`).join('\n')}`);
    }
  }

  return sections.join('\n\n');
}

export type { UserPrefs };
