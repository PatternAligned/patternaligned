// lib/behavioral-tracking.js
// Behavioral event tracking system
// WHY: This captures HOW users interact (not just what they say)
// Every pause, edit, submission gets recorded with timestamps and metadata
// This data feeds the fingerprinting system in Phase 2

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Track behavioral events in real-time
export class BehavioralTracker {
  constructor(userId) {
    this.userId = userId;
    this.messageStartTime = null;
    this.currentMessage = "";
    this.editCount = 0;
    this.lastEditTime = null;
    this.pauseDuration = 0;
  }

  // Call when user STARTS typing a message
  startMessage() {
    this.messageStartTime = Date.now();
    this.currentMessage = "";
    this.editCount = 0;
    this.lastEditTime = Date.now();

    this.trackEvent("message_start", {
      timestamp: new Date().toISOString(),
    });
  }

  // Call as user types (on onChange)
  updateMessage(content) {
    const now = Date.now();
    const timeSinceLastEdit = now - this.lastEditTime;

    // Detect pause (no typing for 2+ seconds)
    if (timeSinceLastEdit > 2000 && this.currentMessage.length > 0) {
      this.trackEvent("message_pause", {
        pause_duration_ms: timeSinceLastEdit,
        character_count: this.currentMessage.length,
      });
    }

    this.currentMessage = content;
    this.editCount++;
    this.lastEditTime = now;
  }

  // Call when user SUBMITS the message
  async submitMessage(content) {
    const now = Date.now();
    const totalTime = now - this.messageStartTime;
    const pauseTime = now - this.lastEditTime;

    // Calculate metrics
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    const tokenCount = Math.ceil(content.length / 4); // Rough approximation

    // Track submission
    this.trackEvent("message_submit", {
      total_composition_time_ms: totalTime,
      pause_before_submit_ms: pauseTime,
      word_count: wordCount,
      token_count: tokenCount,
      edit_count: this.editCount,
      character_count: content.length,
    });

    // Return metadata to be stored with message
    return {
      word_count: wordCount,
      token_count: tokenCount,
      pause_time_ms: Math.max(pauseTime, 0),
      edit_count: this.editCount,
    };
  }

  // Generic event tracker
  async trackEvent(eventType, metadata = {}) {
    try {
      // This requires user to be authenticated (RLS handles access control)
      const { error } = await supabase.from("behavioral_events").insert({
        user_id: this.userId,
        event_type: eventType,
        metadata: JSON.stringify(metadata),
      });

      if (error) {
        console.error("Failed to track event:", error);
      }
    } catch (err) {
      console.error("Error tracking event:", err);
      // Don't throw - behavioral tracking shouldn't break the app
    }
  }

  // Track UI interactions (sidebar, model changes, etc)
  async trackUIEvent(eventType, context = {}) {
    this.trackEvent(eventType, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  // Track page focus/blur (user attention)
  setupPageVisibility() {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.trackEvent("page_blur", {
          time: new Date().toISOString(),
        });
      } else {
        this.trackEvent("page_focus", {
          time: new Date().toISOString(),
        });
      }
    });
  }

  // Track model/temperature changes
  async trackModelChange(model, temperature) {
    this.trackEvent("model_switch", {
      model_used: model,
      temperature: temperature,
    });
  }
}

// React hook for easy integration in components
// Usage: const tracker = useBehavioralTracker(userId)
export function useBehavioralTracker(userId) {
  if (!userId) {
    return null;
  }

  return new BehavioralTracker(userId);
}

// Helper: Extract sentiment from message (basic implementation)
// Returns -1 (negative) to 1 (positive)
export function calculateSentiment(text) {
  const positiveWords = [
    "great",
    "good",
    "excellent",
    "love",
    "awesome",
    "amazing",
    "perfect",
    "wonderful",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "hate",
    "horrible",
    "stupid",
    "wrong",
    "failed",
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) score += 1;
  });

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) score -= 1;
  });

  // Normalize to -1 to 1
  return Math.max(-1, Math.min(1, score / 10));
}

// Helper: Analyze writing style
// Returns metrics about how someone writes
export function analyzeWritingStyle(text) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const avgSentenceLength = words.length / Math.max(sentences.length, 1);

  return {
    avg_word_length: Math.round(avgWordLength * 100) / 100,
    avg_sentence_length: Math.round(avgSentenceLength * 100) / 100,
    total_words: words.length,
    total_sentences: sentences.length,
    lexical_diversity: uniqueWords(words) / words.length,
  };
}

// Helper: Calculate unique word ratio
function uniqueWords(words) {
  return new Set(words.map((w) => w.toLowerCase())).size;
}
