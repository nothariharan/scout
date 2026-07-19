// psychology.js
// A deliberately small, explainable social-signal layer. It never tries to
// diagnose a person; it only gives the strategy engine bounded conversational
// guidance from observable wording in the current call transcript.

const SIGNALS = {
  annoyance: ['stop calling', 'not interested', 'final price', 'no time', 'busy', 'already told you'],
  urgency: ['today only', 'right now', 'last chance', 'someone else', 'immediately'],
  friendliness: ['happy to help', 'sure', 'of course', 'no problem', 'let me see'],
  flexibility: ['can do', 'maybe', 'possible', 'speak to my manager', 'what is your budget'],
};

export function assessConversationClimate(transcript = '') {
  const text = String(transcript).toLowerCase();
  const score = (words) => Math.min(1, words.filter((word) => text.includes(word)).length / 2);
  const annoyance = score(SIGNALS.annoyance);
  const urgency = score(SIGNALS.urgency);
  const friendliness = score(SIGNALS.friendliness);
  const flexibility = score(SIGNALS.flexibility);

  let guidance = 'Keep the exchange concise and ask one clear question.';
  if (annoyance >= 0.5) guidance = 'Reduce pressure, acknowledge the boundary, and ask one relationship-preserving question.';
  else if (urgency >= 0.5) guidance = 'Treat urgency as a signal to verify, not a reason to rush.';
  else if (friendliness >= 0.5 || flexibility >= 0.5) guidance = 'A polite, specific counteroffer is appropriate.';

  return { annoyance, urgency, friendliness, flexibility, guidance };
}
