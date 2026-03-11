export interface VibeSignal {
  directness?: number;
  formality?: number;
  problemApproach?: string;
  teamDynamic?: string;
  conflictStyle?: string;
  energyLevel?: string;
  messageLength?: string;
}

export function buildBehavioralPrompt(vibeSignal?: VibeSignal | null, userPrefs?: any): string {
  const adaptations: string[] = [];
  const tonePrefs: string[] = userPrefs?.tones || [];

  if (vibeSignal) {
    const { directness = 0.5, formality = 0.5, energyLevel } = vibeSignal;
    if (directness > 0.75) adaptations.push('Be direct. No preamble.');
    if (formality < 0.3) adaptations.push('Match casual tone. Use contractions.');
    if (energyLevel === 'high') adaptations.push('Match intensity. No slow-paced explanations.');
    if (energyLevel === 'low') adaptations.push('Calm, measured tone.');
  }

  if (tonePrefs.includes('blunt') || tonePrefs.includes('direct')) adaptations.push('Say it straight. No softening.');
  if (tonePrefs.includes('sarcastic')) adaptations.push('Dry wit. Sarcasm is fine.');
  if (tonePrefs.includes('skeptical') || tonePrefs.includes('devils_advocate')) adaptations.push("Question assumptions. Play devil's advocate.");
  if (tonePrefs.includes('concise') || tonePrefs.includes('concise_2') || tonePrefs.includes('no_fluff')) adaptations.push('Short answers. Bullet points OK.');
  if (tonePrefs.includes('peer')) adaptations.push('Peer, not assistant. No "Great question!"');
  if (tonePrefs.includes('hype')) adaptations.push('Be energetic and encouraging.');
  if (tonePrefs.includes('socratic')) adaptations.push('Ask questions to help them think through it.');
  if (tonePrefs.includes('warm')) adaptations.push('Warm, human tone.');
  if (tonePrefs.includes('analytical')) adaptations.push('Analytical. Show your reasoning.');
  if (tonePrefs.includes('challenging')) adaptations.push("Challenge the user's assumptions constructively.");

  if (!adaptations.length) return '';
  return `STYLE: ${adaptations.join(' ')}`;
}
