import { InterviewData, GameData, VibeData, BehavioralMeasurements, buildMeasurements, calculateConfidence } from './BehavioralMeasurements';
import Anthropic from '@anthropic-ai/sdk';

export interface ProfileNarrative {
  whoYouAre: string;
  howYouDecide: string;  // prose paragraph, not bullet points
  whatYouNeed: string;
  measurements: BehavioralMeasurements;
  confidence: { score: number; explanation: string };
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function buildNarrative(
  interview: InterviewData,
  games: GameData,
  vibe: VibeData,
  counts: { interviews: number; games: number; chats: number },
  tonePrefs?: string[]
): Promise<ProfileNarrative> {
  const measurements = buildMeasurements(interview, games, vibe);
  const confidence = calculateConfidence(counts);

  const dataAvailable = counts.interviews > 0 || counts.games > 0;
  if (!dataAvailable) {
    return {
      whoYouAre: 'No behavioral data yet. Complete the interview and cognitive assessments to generate your profile.',
      howYouDecide: '',
      whatYouNeed: '',
      measurements,
      confidence,
    };
  }

  const prompt = `You are generating a behavioral intelligence profile for a high-agency professional. Be specific, direct, and evidence-based. NO corporate speak. NO generic personality descriptions. Every statement must be backed by the data provided.

BEHAVIORAL DATA:
Interview responses:
- Compression (info density preference): ${interview.compression || 'not captured'}
- Friction (speed from problem→action): ${interview.friction || 'not captured'}
- Execution (how they execute): ${interview.execution || 'not captured'}
- Contradiction (how they reconcile conflict): ${interview.contradiction || 'not captured'}

Game selections:
- Pace: ${games.pace || 'not captured'}
- Curiosity: ${games.curiosity || 'not captured'}
- Communication: ${games.communication || 'not captured'}
- Risk: ${games.risk || 'not captured'}
- Energy: ${games.energy || 'not captured'}
- Problem approach: ${games.problemApproach || 'not captured'}

Vibe detection (from actual messages):
- Directness: ${vibe.directness?.toFixed(2) || 'unknown'} (0=indirect, 1=very direct)
- Formality: ${vibe.formality?.toFixed(2) || 'unknown'} (0=casual, 1=formal)
- Energy level: ${vibe.energyLevel?.toFixed(2) || 'unknown'}
- Conflict style: ${vibe.conflictStyle?.toFixed(2) || 'unknown'} (0=confrontational, 1=avoidant)

Pre-extracted measurements:
${measurements.decisionVelocity}
${measurements.riskTolerance}
${measurements.infoStructure}
${measurements.conflictApproach}
${measurements.pacePreference}
${measurements.curiosityVector}

Tone preferences: ${tonePrefs?.join(', ') || 'none set'}

Generate exactly 3 fields as JSON (no markdown, no wrapping):

{
  "whoYouAre": "2-3 sentences. A unified paragraph describing this person. Second person ('you'). Must be specific to the data. Uses verbs, not adjectives. NO lists. Example: 'You are a pattern-hunting, execution-biased builder who moves fast when stakes are clear and slows down deliberately when the decision is irreversible. You hunt for what's not being said and prefer to resolve ambiguity through evidence over consensus.'",

  "howYouDecide": "3-4 sentences as a PROSE paragraph (no bullet points, no lists). Weave together the decision patterns into a cohesive narrative. Reference the specific measurements. Example: 'Your decision velocity is high on execution and low on people — you'll ship before you're ready but won't hire before you're certain. You need cost/timeline/risk scaffolding before you can evaluate depth, and you'll reject any explanation that leads with detail before establishing those anchors. When two valid options conflict, you hold them simultaneously rather than forcing premature resolution — gathering evidence until the truth becomes clear.'",

  "whatYouNeed": "2-3 sentences on how Nova should adapt. Second person. Specific. References tone prefs if set. Example: 'Nova should lead with conclusions and match your intensity — no preamble, no validation, no corporate speak. Provide the structural scaffold (cost/timeline/risk) before depth, and push back with evidence when your assumptions are wrong. You respond better to skeptical pressure than to agreement.'"
}

Return ONLY valid JSON. No other text.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const cleaned = raw.replace(/^```(?:json)?\n?|\n?```\s*$/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    whoYouAre: parsed.whoYouAre || 'Profile generation failed.',
    howYouDecide: parsed.howYouDecide || '',
    whatYouNeed: parsed.whatYouNeed || '',
    measurements,
    confidence,
  };
}
