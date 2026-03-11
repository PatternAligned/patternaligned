'use client';

import { useState } from 'react';

interface Props {
  onGameComplete?: () => void;
}

interface GameResult {
  topic_choice: string;
  depth_preference: string;
  time_spent_seconds: number;
  choice_hesitation: boolean;
}

const topics = [
  { id: 'abstract', title: 'Abstract Concept', description: 'Pure ideas, no practical application' },
  { id: 'practical', title: 'Practical Problem', description: 'Real-world issue with tangible solution' },
  { id: 'historical', title: 'Historical Mystery', description: 'Past events, patterns, what actually happened' },
  { id: 'conspiracy', title: 'Conspiracy Theory', description: 'Hidden patterns, unconventional connections' },
  { id: 'personal', title: 'Personal Dilemma', description: 'Something about your own life or relationships' },
];

const depthLevels = [
  { id: 'skim', label: 'Skim', time: '1 min read' },
  { id: 'balanced', label: 'Balanced', time: '5 min deep dive' },
  { id: 'obsessive', label: 'Obsessive', time: 'Go full rabbit hole' },
];

export default function CuriosityVector(props: Props) {
  const [screen, setScreen] = useState<'topic' | 'depth'>('topic');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gameStartTime = Date.now();

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
    setScreen('depth');
  };

  const handleDepthSelect = async (depthId: string) => {
    setIsSubmitting(true);

    const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);

    const result: GameResult = {
      topic_choice: selectedTopic || '',
      depth_preference: depthId,
      time_spent_seconds: timeSpent,
      choice_hesitation: false,
    };

    try {
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_event',
          metadata: {
            game: 'curiosity_vector',
            ...result,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log game result');
      }

      if (props.onGameComplete) {
        props.onGameComplete();
      }
    } catch (error) {
      console.error('Error logging game result:', error);
      alert('Error saving result. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (screen === 'topic') {
    return (
      <div className="bg-black min-h-screen text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-light mb-2">Curiosity Vector</h1>
          <p className="text-white/40 mb-12">Which topic intrigues you most?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicSelect(topic.id)}
                className="group border border-white/15 rounded-lg p-6 hover:border-[#c0c0c0] hover:bg-[#c0c0c0] transition text-left"
              >
                <h2 className="text-xl font-bold mb-2 group-hover:text-black">{topic.title}</h2>
                <p className="text-white/50 group-hover:text-black/70">{topic.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-light mb-2">Curiosity Vector</h1>
        <p className="text-white/40 mb-8">How deep do you want to go?</p>

        {selectedTopic && (
          <div className="bg-white/5 border border-white/15 rounded-lg p-6 mb-12">
            <p className="text-sm text-white/40 mb-2">Selected:</p>
            <p className="text-xl font-bold">
              {topics.find((t) => t.id === selectedTopic)?.title}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {depthLevels.map((depth) => (
            <button
              key={depth.id}
              onClick={() => handleDepthSelect(depth.id)}
              disabled={isSubmitting}
              className="group border border-white/15 rounded-lg p-6 hover:border-[#c0c0c0] hover:bg-[#c0c0c0] transition text-left disabled:opacity-50"
            >
              <h2 className="text-xl font-bold mb-2 group-hover:text-black">{depth.label}</h2>
              <p className="text-white/50 group-hover:text-black/70">{depth.time}</p>
            </button>
          ))}
        </div>

        {isSubmitting && <p className="text-center mt-8 text-white/40">Saving...</p>}
      </div>
    </div>
  );
}
