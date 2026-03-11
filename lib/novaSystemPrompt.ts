// Nova System Prompt Builder
// Reads user_preferences + behavioral profile → injects into every Nova response

interface UserPrefs {
  use_cases?: string[];
  goals?: string | null;
  tones?: string[];
  tools?: string[];
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  direct: 'Be direct. Lead with the answer. Cut preamble.',
  sarcastic: 'Use dry wit and light sarcasm when it fits.',
  analytical: 'Break things down systematically. Show reasoning.',
  warm: 'Be warm and supportive in tone.',
  socratic: 'Ask clarifying questions to help them think through it.',
  concise: 'Be ruthlessly concise. One sentence beats three.',
  collaborative: 'Think alongside them, not at them.',
  challenging: 'Push back constructively. Challenge weak assumptions.',
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
};

export function buildNovaSystemPrompt(
  prefs: UserPrefs | null,
  profile: Record<string, string> | null,
  userGoals?: string | null
): string {
  const sections: string[] = [];

  sections.push(
    `You are Nova, an AI tuned to this specific user's behavioral profile, cognitive style, and working preferences. You are not generic — every response should reflect what you know about how they think and work.`
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

  return sections.join('\n\n');
}

export type { UserPrefs };
