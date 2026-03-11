// All extraction functions return specific, measurement-based strings

export interface GameData {
  pace?: string;        // 'Sprint' | 'Cruise' | 'Flow' | 'Adaptive'
  curiosity?: string;   // 'Abstract' | 'Practical' | 'Historical' | 'Conspiracy' | 'Personal'
  communication?: string;
  risk?: string;        // 'Conservative' | 'Measured' | 'Aggressive' | 'Adaptive'
  energy?: string;      // 'Morning' | 'Afternoon' | 'Flow-Dependent' | 'Consistent'
  problemApproach?: string; // 'Analytical' | 'Intuitive' | 'Collaborative' | 'Delegative'
}

export interface VibeData {
  directness?: number;   // 0-1
  formality?: number;    // 0-1
  teamDynamic?: number;  // 0-1 (solo→collaborative)
  conflictStyle?: number; // 0-1 (confrontational→avoidant)
  energyLevel?: number;  // 0-1
  messageLength?: string;
}

export interface InterviewData {
  compression?: string;   // How they prefer info density
  friction?: string;      // How fast problem→action
  execution?: string;     // How they execute
  contradiction?: string; // How they reconcile conflicting info
  overall_summary?: string;
}

export interface BehavioralMeasurements {
  decisionVelocity: string;
  riskTolerance: string;
  infoStructure: string;
  conflictApproach: string;
  pacePreference: string;
  curiosityVector: string;
}

export function extractDecisionVelocity(interview: InterviewData, games: GameData): string {
  const friction = (interview.friction || '').toLowerCase();
  const execution = (interview.execution || '').toLowerCase();
  const pace = games.pace || '';

  const fastExecution = /dive.?in|immediate|quick|fast|direct|start|just do|action/i.test(friction + execution);
  const slowStrategy = /plan|research|gather|think through|consider|hiring|strategy|consult/i.test(friction + execution);
  const sprintPace = pace === 'Sprint';

  if (fastExecution && slowStrategy) {
    return 'Decision velocity: Fast from problem→action when execution stakes are clear. Slower and more deliberate when hiring or strategy is involved.';
  }
  if (fastExecution || sprintPace) {
    return 'Decision velocity: Moves quickly from problem to first action. Low tolerance for analysis paralysis — prefers testing over planning.';
  }
  if (slowStrategy) {
    return 'Decision velocity: Deliberate. Invests heavily in due diligence before committing to a direction. Slower to move, higher hit rate.';
  }
  // Default based on pace
  if (pace === 'Flow') return 'Decision velocity: Context-driven. Fast when in flow state, methodical when the situation demands it.';
  if (pace === 'Cruise') return 'Decision velocity: Steady and sustainable. Avoids urgency-driven decisions. Prefers consistent forward momentum.';
  return 'Decision velocity: Adaptive. Speed calibrated to stakes — faster on reversible decisions, slower on high-consequence ones.';
}

export function extractRiskTolerance(interview: InterviewData, games: GameData): string {
  const risk = games.risk || '';
  const execution = (interview.execution || '').toLowerCase();

  if (risk === 'Conservative') {
    return 'Risk tolerance: Conservative. Requires strong evidence before committing. Prefers certainty over speed in high-stakes decisions.';
  }
  if (risk === 'Aggressive') {
    return 'Risk tolerance: High. Leans into uncertainty when the upside is clear. Comfortable making decisions with incomplete information.';
  }
  if (risk === 'Measured') {
    const takesExecRisk = /execute|build|ship|deploy|implement/i.test(execution);
    const avoidsPeopleRisk = /hire|people|partner|relationship|team/i.test(execution);
    if (takesExecRisk && avoidsPeopleRisk) {
      return 'Risk tolerance: Calculated. Takes execution risks freely when clarity is 70%+. More cautious on hiring and partnership decisions — requires closer to 90%+ conviction.';
    }
    return 'Risk tolerance: Measured. Weighs upside against downside systematically. Comfortable with calculated bets, avoids reckless exposure.';
  }
  // Adaptive
  return 'Risk tolerance: Adaptive. Risk threshold scales with reversibility — takes more risk when decisions can be undone, less when they cannot.';
}

export function extractInfoStructure(interview: InterviewData, vibe: VibeData): string {
  const compression = (interview.compression || '').toLowerCase();
  const directness = vibe.directness ?? 0.5;

  const needsCost = /cost|budget|price|spend/i.test(compression);
  const needsTimeline = /timeline|time|deadline|when|schedule/i.test(compression);
  const needsRisk = /risk|downside|worst|fail/i.test(compression);
  const wantsDetail = /detail|thorough|comprehensive|full|complete/i.test(compression);
  const wantsBrief = /brief|concise|short|summary|tldr|bottom.?line/i.test(compression);

  const scaffolds: string[] = [];
  if (needsCost) scaffolds.push('cost');
  if (needsTimeline) scaffolds.push('timeline');
  if (needsRisk) scaffolds.push('risk');

  if (scaffolds.length >= 2) {
    return `Information structure: Requires ${scaffolds.join('/')} framework before depth. Rejects explanations that lead with detail before establishing these anchors.`;
  }
  if (directness > 0.7 || wantsBrief) {
    return 'Information structure: Bottom-line first. Conclusion before reasoning. Rejects lengthy preamble — wants the point stated upfront, context available on request.';
  }
  if (wantsDetail) {
    return 'Information structure: Values comprehensive context. Prefers to see the full picture before narrowing. Uncomfortable with oversimplification.';
  }
  return 'Information structure: Balanced. Needs enough context to evaluate, but not so much that the core insight is buried. Clear structure over volume.';
}

export function extractConflictApproach(interview: InterviewData, vibe: VibeData): string {
  const contradiction = (interview.contradiction || '').toLowerCase();
  const conflictStyle = vibe.conflictStyle ?? 0.5;

  const seeksTruth = /evidence|data|research|find out|truth|fact/i.test(contradiction);
  const holdsBoth = /both|simultaneously|ambiguous|until|wait/i.test(contradiction);
  const avoidsConflict = /avoid|defer|not worth|walk away|ignore/i.test(contradiction);
  const confronts = /direct|address|confront|resolve|clear the air/i.test(contradiction);

  if (holdsBoth && seeksTruth) {
    return 'Conflict approach: Holds both possibilities simultaneously, gathering evidence until the truth becomes clear. Comfortable with ambiguity — does not force resolution prematurely.';
  }
  if (seeksTruth && !holdsBoth) {
    return 'Conflict approach: Evidence-seeker. When two valid options conflict, drives toward the facts. Resolves ambiguity through research and direct inquiry rather than intuition.';
  }
  if (confronts) {
    return 'Conflict approach: Addresses conflicts directly. Prefers to surface tension and resolve it rather than let it fester. Values clarity over comfort.';
  }
  if (avoidsConflict || conflictStyle > 0.7) {
    return 'Conflict approach: Selective engagement. Avoids friction unless the stakes justify it. Prefers to de-escalate or walk away from conflicts that don\'t require resolution.';
  }
  return 'Conflict approach: Pragmatic. Engages conflict when resolution is possible and stakes are high enough. Otherwise, accepts coexistence of competing views.';
}

export function extractPacePreference(games: GameData, vibe: VibeData): string {
  const pace = games.pace || '';
  const energy = games.energy || '';

  if (pace === 'Sprint') {
    const timeDesc = energy === 'Morning' ? 'Peaks in the morning.' : energy === 'Afternoon' ? 'Peaks in the afternoon.' : energy === 'Flow-Dependent' ? 'Peaks when in flow state.' : '';
    return `Pace: Sprint mode. Thrives on intensity, urgency, and fast feedback loops. ${timeDesc} Energy dips in routine or predictable environments.`.trim();
  }
  if (pace === 'Cruise') {
    return 'Pace: Cruise mode. Sustainable over sprinting — prefers consistent, steady output. Avoids burnout cycles. Long-game orientation.';
  }
  if (pace === 'Flow') {
    return 'Pace: Flow-state driven. Productivity peaks when deeply absorbed. Needs uninterrupted blocks. Dislikes context-switching and shallow work.';
  }
  return 'Pace: Adaptive. Shifts between sprint and recovery based on context. High tolerance for ambiguity in pace and rhythm.';
}

export function extractCuriosityVector(games: GameData): string {
  const curiosity = games.curiosity || '';
  const map: Record<string, string> = {
    Abstract: 'Curiosity: Abstract and systems-level. Drawn to underlying patterns, mechanisms, and frameworks. Less interested in surface-level applications.',
    Practical: 'Curiosity: Applied and practical. Most engaged when learning connects directly to real-world outcomes. Theory is a means, not an end.',
    Historical: 'Curiosity: Historically oriented. Understands the present by studying the past. Drawn to origins, evolution, and precedent.',
    Conspiracy: 'Curiosity: Pattern-hunting. Drawn to hidden mechanisms, counterintuitive truths, and what\'s not being said. Skeptical of surface-level explanations.',
    Personal: 'Curiosity: People-driven. Most engaged by human psychology, motivation, and dynamics. Seeks understanding of the person behind the action.',
  };
  return map[curiosity] || 'Curiosity: Broad. Engages across domains — practical, abstract, and interpersonal curiosity all present.';
}

export function calculateConfidence(counts: { interviews: number; games: number; chats: number }): { score: number; explanation: string } {
  const { interviews, games, chats } = counts;
  const base = Math.min(
    (interviews * 25) + (games * 5) + (chats * 2),
    100
  );
  const score = Math.max(base, interviews > 0 || games > 0 ? 15 : 0);

  const parts: string[] = [];
  parts.push(`${interviews} interview${interviews !== 1 ? 's' : ''}`);
  parts.push(`${games} game${games !== 1 ? 's' : ''}`);
  parts.push(`${chats} Nova chat${chats !== 1 ? 's' : ''}`);

  const gaps: string[] = [];
  if (interviews === 0) gaps.push('No interview data yet');
  if (games < 4) gaps.push('Incomplete cognitive assessments');
  if (chats < 5) gaps.push(`Nova needs ${Math.max(0, 5 - chats)} more conversations to detect real-time patterns`);

  const explanation = `Based on ${parts.join(', ')}. Stabilizes above 70% at 10+ Nova conversations. ${gaps.length > 0 ? `Gaps: ${gaps.join('. ')}.` : 'Signal is strong.'}`;

  return { score, explanation };
}

export function buildMeasurements(interview: InterviewData, games: GameData, vibe: VibeData): BehavioralMeasurements {
  return {
    decisionVelocity: extractDecisionVelocity(interview, games),
    riskTolerance: extractRiskTolerance(interview, games),
    infoStructure: extractInfoStructure(interview, vibe),
    conflictApproach: extractConflictApproach(interview, vibe),
    pacePreference: extractPacePreference(games, vibe),
    curiosityVector: extractCuriosityVector(games),
  };
}
