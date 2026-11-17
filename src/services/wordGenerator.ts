// Consistent English word dictionary (Monkeytype-style common words, 300+ balanced words)
export const COMMON_WORDS = [
  'the', 'be', 'of', 'and', 'a', 'to', 'in', 'he', 'have', 'it', 'that', 'for', 'they', 'with', 'as', 'not',
  'on', 'she', 'at', 'by', 'this', 'we', 'you', 'do', 'but', 'his', 'from', 'they', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
  'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most',
  'us', 'world', 'life', 'hand', 'part', 'child', 'eye', 'woman', 'place', 'work', 'week', 'case', 'point',
  'government', 'company', 'number', 'group', 'problem', 'fact', 'water', 'write', 'learn', 'power', 'run',
  'small', 'large', 'big', 'light', 'dark', 'open', 'close', 'start', 'stop', 'play', 'live', 'read', 'move',
  'stand', 'turn', 'hold', 'bring', 'system', 'program', 'build', 'right', 'left', 'next', 'high', 'low',
  'early', 'late', 'great', 'real', 'best', 'better', 'order', 'door', 'house', 'city', 'room', 'space',
  'area', 'side', 'kind', 'head', 'face', 'long', 'short', 'hard', 'easy', 'clear', 'true', 'fast', 'slow',
  'fine', 'sure', 'free', 'full', 'keep', 'help', 'talk', 'walk', 'show', 'hear', 'listen', 'mean', 'call',
  'find', 'tell', 'ask', 'seem', 'feel', 'try', 'leave', 'call', 'speed', 'test', 'press', 'shift', 'space',
  'enter', 'type', 'track', 'clock', 'score', 'match', 'round', 'board', 'quick', 'clean', 'focus', 'flow',
  'level', 'sharp', 'pulse', 'drive', 'reach', 'smart', 'skill', 'lead', 'ready', 'point', 'frame', 'solid',
  'rapid', 'force', 'form', 'line', 'text', 'word', 'view', 'page', 'card', 'step', 'path', 'mark', 'rate',
  'code', 'mode', 'grid', 'rank', 'top', 'base', 'core', 'peak', 'pure', 'calm', 'steady', 'swift', 'prime'
];

/**
 * Generates an array of random English words from the common dictionary.
 * Uses pseudo-random distribution to ensure high consistency and fair competition.
 */
export function generateWords(count: number = 180): string[] {
  const result: string[] = [];
  const poolLength = COMMON_WORDS.length;

  let lastWord = '';
  for (let i = 0; i < count; i++) {
    let randomIndex = Math.floor(Math.random() * poolLength);
    let chosenWord = COMMON_WORDS[randomIndex];

    // Avoid immediate repetition of the exact same word
    while (chosenWord === lastWord) {
      randomIndex = Math.floor(Math.random() * poolLength);
      chosenWord = COMMON_WORDS[randomIndex];
    }

    result.push(chosenWord);
    lastWord = chosenWord;
  }

  return result;
}
