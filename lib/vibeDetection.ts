// Nova Vibe Detection
// Reads behavioral signals from user messages in real-time.
// Informs how Nova talks, not just what it says.

export interface VibeSignals {
  directness: 'blunt' | 'direct' | 'diplomatic' | null;
  formality: 'casual' | 'formal' | 'neutral' | null;
  problemApproach: 'diver' | 'planner' | null;
  teamDynamic: 'solo' | 'collaborative' | null;
  conflictStyle: 'confrontational' | 'avoidant' | null;
  energyLevel: 'high' | 'medium' | 'low' | null;
  messageLength: 'terse' | 'verbose' | 'normal';
}

export interface VibeAdaptations {
  // Nova behavior directives derived from vibe signals
  matchTerseness: boolean;     // mirror their brevity
  dropHedging: boolean;        // no "I think", "perhaps", "might"
  dropFormalities: boolean;    // no "Certainly!", "Of course!", "Great question!"
  useCasualLanguage: boolean;  // contractions, informal phrasing
  showWorkingOut: boolean;     // walk through reasoning step by step
  biasToAction: boolean;       // lead with "do X" over "consider doing X"
  acknowledgeTeam: boolean;    // frame things in terms of "your team" when relevant
  beDirectAboutDisagreement: boolean; // don't soften pushback
}

// Score directness from 0 (diplomatic) to 10 (blunt)
function scoreDirectness(msgs: string[]): number {
  let score = 5;
  const text = msgs.join(' ').toLowerCase();

  // Bluntness signals
  if (/\bjust do it\b|\bjust ship\b|\bjust fix\b|\bjust use\b/.test(text)) score += 2;
  if (/\bwtf\b|\bbs\b|\bscrew\b|\bfuck\b|\bdumb\b|\bstupid\b/.test(text)) score += 2;
  if (/\bno\b.*\bbut\b/.test(text)) score += 1;
  if (/^[A-Z][^.!?]*[.!?]$/.test(msgs[msgs.length - 1] || '')) score += 1; // short declarative

  // Diplomatic signals
  if (/\bwould you\b|\bcould we\b|\bmaybe\b|\bperhaps\b|\bjust a thought\b/.test(text)) score -= 2;
  if (/\bi was thinking\b|\bwhat do you think\b|\bnot sure if\b/.test(text)) score -= 1;
  if (/\bif that makes sense\b|\bdoes that sound\b|\bhopefully\b/.test(text)) score -= 1;

  return Math.max(0, Math.min(10, score));
}

// Score formality from 0 (casual) to 10 (formal)
function scoreFormality(msgs: string[]): number {
  let score = 5;
  const text = msgs.join(' ');
  const lower = text.toLowerCase();

  // Casual signals
  const contractions = (text.match(/\b(it's|i'm|we're|don't|can't|won't|i've|i'd|they're|you're|let's|that's|what's)\b/gi) || []).length;
  score -= Math.min(3, contractions);
  if (/\byeah\b|\bnah\b|\bkinda\b|\bsorta\b|\bgonna\b|\bwanna\b|\btbh\b|\bidk\b|\bngl\b/.test(lower)) score -= 2;
  if (/[a-z]{2,}/.test(text) && text === text.toLowerCase()) score -= 1; // all lowercase

  // Formal signals
  if (/\bregarding\b|\bfurthermore\b|\bmoreover\b|\bin order to\b|\bI would like\b|\bplease advise\b/.test(text)) score += 2;
  if (/\bthank you for\b|\bI appreciate\b/.test(text)) score += 1;

  return Math.max(0, Math.min(10, score));
}

// Detect problem approach: do they dive in or plan first?
function detectProblemApproach(msgs: string[]): 'diver' | 'planner' | null {
  const text = msgs.join(' ').toLowerCase();
  let diverScore = 0;
  let plannerScore = 0;

  if (/\bjust try\b|\bjust ship\b|\bjust do\b|\bship it\b|\bdo it now\b|\bfigure it out\b/.test(text)) diverScore += 2;
  if (/\bquick(ly)?\b|\bfast\b|\basap\b|\bright now\b|\bimmediately\b/.test(text)) diverScore += 1;
  if (/\bdon't overthink\b|\bstop planning\b|\bjust start\b/.test(text)) diverScore += 2;

  if (/\bhow should (i|we)\b|\bwhat('s| is) the (plan|approach|strategy|best way)\b/.test(text)) plannerScore += 2;
  if (/\bthink (through|about)\b|\bplan (this|it|out)\b|\bmap out\b|\bstep by step\b/.test(text)) plannerScore += 2;
  if (/\bbefore (i|we) (start|begin|build|write)\b/.test(text)) plannerScore += 1;

  if (diverScore === 0 && plannerScore === 0) return null;
  if (diverScore > plannerScore) return 'diver';
  if (plannerScore > diverScore) return 'planner';
  return null;
}

// Detect team dynamic: solo or collaborative?
function detectTeamDynamic(msgs: string[]): 'solo' | 'collaborative' | null {
  const text = msgs.join(' ').toLowerCase();
  let soloScore = 0;
  let collabScore = 0;

  const iCount = (text.match(/\bi\b/g) || []).length;
  const weCount = (text.match(/\bwe\b|\bour\b|\bteam\b/g) || []).length;

  soloScore += Math.min(3, Math.floor(iCount / 3));
  collabScore += Math.min(3, weCount);

  if (/\bmy team\b|\bour team\b|\bcollaborat\b|\btogether\b/.test(text)) collabScore += 2;
  if (/\bi need\b|\bi want\b|\bi('m| am) building\b|\bi('m| am) trying\b/.test(text)) soloScore += 1;

  if (soloScore === 0 && collabScore === 0) return null;
  if (collabScore > soloScore + 1) return 'collaborative';
  if (soloScore > collabScore + 1) return 'solo';
  return null;
}

// Detect conflict style: do they push back directly or avoid?
function detectConflictStyle(msgs: string[]): 'confrontational' | 'avoidant' | null {
  const text = msgs.join(' ').toLowerCase();
  let confrontScore = 0;
  let avoidScore = 0;

  if (/\bthat('s| is) wrong\b|\bi disagree\b|\bno,\b|\bactually,\b|\bthat doesn't\b/.test(text)) confrontScore += 2;
  if (/\bpush back\b|\bcall (it|this) out\b|\bcall out\b/.test(text)) confrontScore += 2;
  if (/\bnot really\b|\bthat won't work\b|\bthat's not\b/.test(text)) confrontScore += 1;

  if (/\bnot sure (if|that)\b|\bjust checking\b|\bmaybe i'm wrong\b|\bcorrect me if\b/.test(text)) avoidScore += 2;
  if (/\bdon't want to (cause|create)\b|\bnot trying to\b|\bhope this doesn't\b/.test(text)) avoidScore += 2;

  if (confrontScore === 0 && avoidScore === 0) return null;
  if (confrontScore > avoidScore) return 'confrontational';
  if (avoidScore > confrontScore) return 'avoidant';
  return null;
}

// Measure energy level from message characteristics
function detectEnergyLevel(msgs: string[]): 'high' | 'medium' | 'low' {
  const recent = msgs.slice(-3); // last 3 messages
  let score = 0;

  for (const msg of recent) {
    if (msg.includes('!')) score += 1;
    if (/[A-Z]{2,}/.test(msg)) score += 1; // caps = emphasis
    if (msg.length > 200) score += 1;
    if (/\burgen(t|cy)\b|\basap\b|\bcritical\b|\bbreaking\b/.test(msg.toLowerCase())) score += 2;
    if (/\btired\b|\bstuck\b|\bfrustrat\b|\bnot sure\b|\bhelp\b/.test(msg.toLowerCase())) score -= 1;
  }

  if (score >= 3) return 'high';
  if (score <= -1) return 'low';
  return 'medium';
}

// Measure average message length
function detectMessageLength(msgs: string[]): 'terse' | 'verbose' | 'normal' {
  if (!msgs.length) return 'normal';
  const avg = msgs.reduce((sum, m) => sum + m.length, 0) / msgs.length;
  if (avg < 40) return 'terse';
  if (avg > 250) return 'verbose';
  return 'normal';
}

export function detectVibe(userMessages: string[]): VibeSignals {
  if (!userMessages.length) {
    return {
      directness: null,
      formality: null,
      problemApproach: null,
      teamDynamic: null,
      conflictStyle: null,
      energyLevel: null,
      messageLength: 'normal',
    };
  }

  const directnessScore = scoreDirectness(userMessages);
  const formalityScore = scoreFormality(userMessages);

  return {
    directness:
      directnessScore >= 7 ? 'blunt' :
      directnessScore >= 4 ? 'direct' :
      'diplomatic',
    formality:
      formalityScore <= 3 ? 'casual' :
      formalityScore >= 7 ? 'formal' :
      'neutral',
    problemApproach: detectProblemApproach(userMessages),
    teamDynamic: detectTeamDynamic(userMessages),
    conflictStyle: detectConflictStyle(userMessages),
    energyLevel: detectEnergyLevel(userMessages),
    messageLength: detectMessageLength(userMessages),
  };
}

export function deriveAdaptations(vibe: VibeSignals): VibeAdaptations {
  return {
    matchTerseness: vibe.messageLength === 'terse',
    dropHedging: vibe.directness === 'blunt' || vibe.directness === 'direct',
    dropFormalities: vibe.formality === 'casual' || vibe.directness === 'blunt',
    useCasualLanguage: vibe.formality === 'casual',
    showWorkingOut: vibe.problemApproach === 'planner' || vibe.messageLength === 'verbose',
    biasToAction: vibe.problemApproach === 'diver',
    acknowledgeTeam: vibe.teamDynamic === 'collaborative',
    beDirectAboutDisagreement: vibe.conflictStyle === 'confrontational',
  };
}
