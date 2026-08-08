// Know Your Partner · question bank
// Same 8 categories / 32 questions as the prototype, now with metadata
// (depth, relationshipStage, intimacy) to power the smarter picker later.

const QUESTIONS = {
  "Us": {
    icon: "♡", color: "#c98286", depth: 1, intimacy: 1,
    qs: [
      "What is one thing you think makes our relationship different from most?",
      "What is something small I do that makes you feel loved?",
      "What do you hope never changes about us?",
      "When do you feel most like we're a team?"
    ]
  },
  "Feelings": {
    icon: "◌", color: "#b96e78", depth: 2, intimacy: 2,
    qs: [
      "When you're having a terrible day, what do you secretly want from me?",
      "What is something you find difficult to ask for?",
      "What makes you feel most emotionally safe with someone?",
      "What is a feeling you wish you expressed more often?"
    ]
  },
  "Future": {
    icon: "↗", color: "#a9515a", depth: 2, intimacy: 1,
    qs: [
      "What kind of life would make you genuinely happy ten years from now?",
      "Where would you want us to wake up on an ordinary Sunday someday?",
      "What is one dream you're afraid you might never achieve?",
      "What matters more to you: stability, freedom, or adventure?"
    ]
  },
  "Memories": {
    icon: "◷", color: "#c17f70", depth: 1, intimacy: 1,
    qs: [
      "What childhood memory still feels warm when you think about it?",
      "What is a moment in your life that changed who you became?",
      "What is something from your past you wish I could have witnessed?",
      "What smell, song, or place instantly takes you back somewhere?"
    ]
  },
  "Fun": {
    icon: "✦", color: "#b87868", depth: 1, intimacy: 1,
    qs: [
      "If we had to disappear for 48 hours tomorrow, where would we go?",
      "What ridiculous thing would you happily do with me?",
      "If our relationship were a movie, what genre would it be?",
      "What weird opinion could you probably convince me to adopt?"
    ]
  },
  "Deep stuff": {
    icon: "∞", color: "#8e4d55", depth: 3, intimacy: 3,
    qs: [
      "What is something you're still figuring out about yourself?",
      "What do you think people misunderstand about you?",
      "What would you want me to remember if you were having a very difficult year?",
      "What does a good life actually mean to you?"
    ]
  },
  "Intimacy": {
    icon: "☾", color: "#9e3f4b", depth: 3, intimacy: 3,
    qs: [
      "When do you feel closest to me?",
      "What kind of affection makes you feel most wanted?",
      "What is something romantic you'd love us to do more often?",
      "What helps you feel comfortable being completely vulnerable?"
    ]
  },
  "Me": {
    icon: "·", color: "#d0938d", depth: 2, intimacy: 2,
    qs: [
      "What is a part of yourself you're proud of but rarely talk about?",
      "What is one habit you wish you could change?",
      "What kind of compliment actually stays with you?",
      "What do you think you need more of in your life right now?"
    ]
  }
};

const QUESTION_ORDER = Object.keys(QUESTIONS);

const QUESTIONS_DB = Object.entries(QUESTIONS).reduce((acc, [cat, d]) => {
  acc[cat] = d.qs.map((q, i) => ({
    category: cat, question: q, question_index: i,
    depth: d.depth, intimacy: d.intimacy
  }));
  return acc;
}, {});

function questionAt(category, index) {
  const list = QUESTIONS_DB[category] || [];
  return list[index] || null;
}

// Simulated partner answers, used only in demo mode.
const DEMO_ANSWERS = [
  "When you remember tiny things I told you months ago.",
  "Honestly, I want you to sit beside me and not try to fix anything.",
  "I think I'd choose a quiet life with enough freedom to disappear for a weekend.",
  "The first time we stayed up talking until neither of us knew what time it was.",
  "I'd happily get lost in a city with you and figure it out as we go.",
  "I think a good life is one where ordinary days still feel worth remembering.",
  "When we're together and neither of us feels like we have to perform.",
  "I don't say it often, but I'm proud of how much I've changed."
];

// Expose on window so store.js and inline handlers can reach them.
window.QUESTIONS = QUESTIONS;
window.QUESTION_ORDER = QUESTION_ORDER;
window.QUESTIONS_DB = QUESTIONS_DB;
window.questionAt = questionAt;
window.DEMO_ANSWERS = DEMO_ANSWERS;