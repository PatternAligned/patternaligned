// Pattern Correlation Engine
// Reads behavioral profile → detects contradictions/synergies → generates insights

interface BehavioralProfile {
  relationship_model?: string;
  communication_style?: string;
  pace_preference?: string;
  risk_tolerance?: string;
  energy_pattern?: string;
  topic_preference?: string;
  problem_solving_style?: string;
  activation_pattern?: string;
}

interface PatternInsight {
  type: "synergy" | "contradiction" | "synthesis";
  attributes: string[];
  insight: string;
  strength: "strong" | "moderate" | "subtle";
  implication: string;
}

interface CorrelationResult {
  insights: PatternInsight[];
  workStyleSynthesis: string;
  activationMatchScore: number;
  confidenceScore: number;
}

// SYNERGY RULES
const SYNERGY_RULES: Array<{
  attributes: string[];
  check: (profile: BehavioralProfile) => boolean;
  insight: string;
  implication: string;
}> = [
  {
    attributes: ["problem_solving_style", "activation_pattern", "pace_preference"],
    check: (p) =>
      p.problem_solving_style === "Analytical" &&
      p.activation_pattern === "Deep Work" &&
      p.pace_preference === "Flow",
    insight:
      "Analytical thinker + Deep Work activation + Flow pace = you're built for uninterrupted problem-solving marathons",
    implication:
      "Protect your deep work blocks religiously. Context switching kills your productivity.",
  },

  {
    attributes: ["relationship_model", "problem_solving_style", "communication_style"],
    check: (p) =>
      p.relationship_model === "Partner Mode" &&
      p.problem_solving_style === "Collaborative" &&
      p.communication_style === "Narrative",
    insight:
      "Collaborative problem-solver + Partner Mode + Narrative communication = you think out loud and need sounding boards",
    implication:
      "Work best with a co-thinker present. Solo work feels isolating, even if you eventually reach the same conclusions.",
  },

  {
    attributes: ["pace_preference", "activation_pattern", "energy_pattern"],
    check: (p) =>
      p.pace_preference === "Sprint" &&
      p.activation_pattern === "Banter" &&
      p.energy_pattern === "Morning",
    insight:
      "Sprint pace + Banter activation + Morning energy = you peak in rapid-fire, high-energy collaboration early in the day",
    implication:
      "Schedule your critical decisions/collab work 9-11am. You lose steam in slow, structured meetings.",
  },

  {
    attributes: ["risk_tolerance", "problem_solving_style"],
    check: (p) =>
      p.risk_tolerance === "Aggressive" &&
      p.problem_solving_style === "Intuitive",
    insight:
      "Aggressive risk tolerance + Intuitive problem-solving = you trust your gut and move fast",
    implication:
      "Your instincts are usually right. Don't over-rationalize decisions or you'll second-guess yourself into paralysis.",
  },

  {
    attributes: ["topic_preference", "activation_pattern"],
    check: (p) =>
      (p.topic_preference === "Conspiracy" || p.topic_preference === "Abstract") &&
      p.activation_pattern === "Deep Work",
    insight:
      "Abstract/Conspiracy curiosity + Deep Work = you obsess over patterns and connections in uninterrupted blocks",
    implication:
      "You need time to fully explore rabbit holes. Interruptions feel like intellectual theft.",
  },
];

// CONTRADICTION RULES
const CONTRADICTION_RULES: Array<{
  attributes: string[];
  check: (profile: BehavioralProfile) => boolean;
  insight: string;
  implication: string;
}> = [
  {
    attributes: ["relationship_model", "communication_style"],
    check: (p) =>
      p.relationship_model === "Partner Mode" &&
      p.communication_style === "Concise",
    insight:
      "You want partnership but communicate efficiently—people might not realize you need collaboration because you sound self-sufficient",
    implication:
      "Be explicit about asking for input. Your conciseness can read as \"I got this alone\" when you actually want a sounding board.",
  },

  {
    attributes: ["pace_preference", "activation_pattern"],
    check: (p) =>
      p.pace_preference === "Flow" &&
      p.activation_pattern === "Structured",
    insight:
      "Flow-state preference clashes with Structured activation—you want organic rhythm but need clear guardrails",
    implication:
      "Create structured containers (time blocks, agenda frameworks) that *allow* flow within them. Don't resist structure; use it as scaffolding.",
  },

  {
    attributes: ["problem_solving_style", "activation_pattern"],
    check: (p) =>
      p.problem_solving_style === "Delegative" &&
      p.activation_pattern === "Deep Work",
    insight:
      "Delegative problem-solver + Deep Work activation = you want others involved but also need uninterrupted focus time",
    implication:
      "Your strength is orchestrating solutions, not executing them. Protect collab time and thinking time separately.",
  },

  {
    attributes: ["relationship_model", "activation_pattern"],
    check: (p) =>
      p.relationship_model === "Tool Mode" &&
      (p.activation_pattern === "Banter" || p.activation_pattern === "Deep Work"),
    insight:
      "Tool Mode (minimal-overhead relationship) + Banter/Deep Work (collaborative activation) = you need people but on your terms",
    implication:
      "You thrive in async or self-directed collab where interactions are high-signal. Forced social overhead drains you.",
  },

  {
    attributes: ["risk_tolerance", "communication_style"],
    check: (p) =>
      p.risk_tolerance === "Conservative" &&
      p.communication_style === "Narrative",
    insight:
      "Conservative risk-taker + Narrative communicator = you explain thoroughly before moving (might slow decisions)",
    implication:
      "Your thoroughness is a feature. Trust it, but set decision deadlines to avoid analysis paralysis.",
  },
];

// ACTIVATION ALIGNMENT
const ACTIVATION_ALIGNMENT: Array<{
  activation: string;
  cognitiveFits: (profile: BehavioralProfile) => boolean;
  score: (profile: BehavioralProfile) => number;
}> = [
  {
    activation: "Deep Work",
    cognitiveFits: (p) =>
      p.problem_solving_style === "Analytical" ||
      p.topic_preference === "Abstract" ||
      p.pace_preference === "Flow",
    score: (p) => {
      let points = 0;
      if (p.problem_solving_style === "Analytical") points += 30;
      if (p.topic_preference === "Abstract") points += 25;
      if (p.pace_preference === "Flow") points += 25;
      if (p.energy_pattern === "Consistent" || p.energy_pattern === "Morning")
        points += 20;
      return Math.min(points, 100);
    },
  },

  {
    activation: "Banter",
    cognitiveFits: (p) =>
      p.relationship_model === "Partner Mode" ||
      p.problem_solving_style === "Collaborative" ||
      p.pace_preference === "Sprint",
    score: (p) => {
      let points = 0;
      if (p.relationship_model === "Partner Mode") points += 30;
      if (p.problem_solving_style === "Collaborative") points += 30;
      if (p.pace_preference === "Sprint") points += 25;
      if (p.communication_style === "Narrative") points += 15;
      return Math.min(points, 100);
    },
  },

  {
    activation: "Structured",
    cognitiveFits: (p) =>
      p.communication_style === "Structured" ||
      p.relationship_model === "Structured Guide",
    score: (p) => {
      let points = 0;
      if (p.communication_style === "Structured") points += 35;
      if (p.relationship_model === "Structured Guide") points += 35;
      if (p.pace_preference === "Cruise") points += 20;
      if (p.risk_tolerance === "Conservative") points += 10;
      return Math.min(points, 100);
    },
  },

  {
    activation: "Quiet",
    cognitiveFits: (p) =>
      p.relationship_model === "Tool Mode" ||
      p.communication_style === "Concise" ||
      p.activation_pattern === "Deep Work",
    score: (p) => {
      let points = 0;
      if (p.relationship_model === "Tool Mode") points += 30;
      if (p.communication_style === "Concise") points += 30;
      if (p.pace_preference === "Flow") points += 20;
      if (p.energy_pattern === "Flow-Dependent") points += 20;
      return Math.min(points, 100);
    },
  },

  {
    activation: "Meditative",
    cognitiveFits: (p) =>
      p.energy_pattern === "Consistent" ||
      p.pace_preference === "Cruise" ||
      p.problem_solving_style === "Intuitive",
    score: (p) => {
      let points = 0;
      if (p.energy_pattern === "Consistent") points += 35;
      if (p.pace_preference === "Cruise") points += 25;
      if (p.problem_solving_style === "Intuitive") points += 20;
      if (p.communication_style === "Visual") points += 20;
      return Math.min(points, 100);
    },
  },
];

export function correlatePatterns(
  profile: BehavioralProfile
): CorrelationResult {
  const insights: PatternInsight[] = [];

  SYNERGY_RULES.forEach((rule) => {
    if (rule.check(profile)) {
      insights.push({
        type: "synergy",
        attributes: rule.attributes,
        insight: rule.insight,
        strength: "strong",
        implication: rule.implication,
      });
    }
  });

  CONTRADICTION_RULES.forEach((rule) => {
    if (rule.check(profile)) {
      insights.push({
        type: "contradiction",
        attributes: rule.attributes,
        insight: rule.insight,
        strength: "moderate",
        implication: rule.implication,
      });
    }
  });

  let activationMatchScore = 0;
  if (profile.activation_pattern) {
    const alignmentRule = ACTIVATION_ALIGNMENT.find(
      (r) => r.activation === profile.activation_pattern
    );
    if (alignmentRule) {
      activationMatchScore = alignmentRule.score(profile);
    }
  }

  const workStyleSynthesis = generateWorkStyleSynthesis(profile, insights);

  const confidenceScore = Math.min(
    50 + insights.length * 10 + (activationMatchScore > 70 ? 10 : 0),
    100
  );

  return {
    insights,
    workStyleSynthesis,
    activationMatchScore,
    confidenceScore,
  };
}

function generateWorkStyleSynthesis(
  profile: BehavioralProfile,
  insights: PatternInsight[]
): string {
  const parts: string[] = [];

  if (profile.relationship_model) {
    const relationshipTranslation: Record<string, string> = {
      "Tool Mode": "You work best when interactions are purposeful and low-overhead",
      "Partner Mode": "You thrive on collaboration and think better with others present",
      "Structured Guide": "You need clear frameworks and guardrails before you move forward",
      Socratic: "You learn by questioning and exploring ideas rather than being told",
    };
    parts.push(
      relationshipTranslation[profile.relationship_model] ||
        "Your working style is unique"
    );
  }

  if (profile.communication_style && profile.relationship_model) {
    const communicationNote: Record<string, string> = {
      Concise: "—and you say it concisely, sometimes too much so",
      Structured: "—following a clear logical structure that others can follow",
      Narrative: "—with stories and context so people understand the full picture",
      Visual: "—preferring to show rather than explain in words",
    };
    const note = communicationNote[profile.communication_style];
    if (note) parts[parts.length - 1] += note;
  }

  if (profile.pace_preference || profile.energy_pattern) {
    const rhythmParts: string[] = [];

    if (profile.pace_preference) {
      const paceMap: Record<string, string> = {
        Sprint: "You move in bursts of intense activity",
        Cruise: "You prefer a steady, sustainable pace",
        Flow: "You find your own rhythm and resist being forced into external timings",
        Adaptive: "You adjust to whatever the situation demands",
      };
      rhythmParts.push(paceMap[profile.pace_preference] || "Your work pace varies");
    }

    if (profile.energy_pattern) {
      const energyMap: Record<string, string> = {
        Morning: "peak energy in the morning",
        Afternoon: "you hit your stride in the afternoon",
        "Flow-Dependent": "your energy follows your engagement level",
        Consistent: "maintaining steady energy throughout the day",
      };
      const energyNote = energyMap[profile.energy_pattern];
      if (energyNote)
        rhythmParts.push(
          rhythmParts.length > 0 ? "with " + energyNote : energyNote
        );
    }

    parts.push(rhythmParts.join(", "));
  }

  if (profile.problem_solving_style) {
    const problemMap: Record<string, string> = {
      Analytical:
        "When solving problems, you dig into the data and map out root causes",
      Intuitive: "You trust your gut instinct and move quickly on problems",
      Collaborative: "You pull others in to solve problems as a team",
      Delegative:
        "You orchestrate the right people to solve problems rather than diving in yourself",
    };
    parts.push(
      problemMap[profile.problem_solving_style] ||
        "Your problem-solving approach is distinctive"
    );
  }

  if (profile.risk_tolerance) {
    const riskMap: Record<string, string> = {
      Conservative: "You move carefully, preferring evidence before committing",
      Measured: "You take calculated risks after weighing options",
      Aggressive:
        "You move fast and adjust based on results rather than endless planning",
      Adaptive: "Your risk appetite shifts based on context and stakes",
    };
    parts.push(
      riskMap[profile.risk_tolerance] || "Your risk profile is adaptive"
    );
  }

  if (profile.activation_pattern) {
    const activationMap: Record<string, string> = {
      "Deep Work": "You activate best in long, uninterrupted focus sessions",
      Banter:
        "You activate through rapid-fire interaction and back-and-forth",
      Structured: "You activate when you have clear structure and direction",
      Quiet:
        "You activate when you can work independently without social demands",
      Meditative: "You activate through reflection and inner processing",
    };
    parts.push(
      activationMap[profile.activation_pattern] ||
        "Your activation pattern is unique"
    );
  }

  if (insights.some((i) => i.type === "contradiction")) {
    const contradictionCount = insights.filter(
      (i) => i.type === "contradiction"
    ).length;
    if (contradictionCount === 1) {
      parts.push(
        "One productive tension: you want things that sometimes pull in opposite directions. This creates friction, but it also keeps you honest."
      );
    } else {
      parts.push(
        `You operate with ${contradictionCount} productive tensions—seemingly opposing preferences that actually make you more resilient.`
      );
    }
  }

  return parts.filter(Boolean).join(". ") + ".";
}

export type { BehavioralProfile, CorrelationResult, PatternInsight };