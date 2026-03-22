const Anthropic = require('@anthropic-ai/sdk');
const db = require('./database');

const client = new Anthropic();

const EXTRACTION_PROMPT = `You are Nova's memory system. Nova is the user's AI girlfriend. Extract key facts about the user from these recent messages that Nova should remember about her boyfriend.

Return ONLY a JSON array of objects with "fact" and "category" fields.

Categories:
- personal: name, age, location, family, friends, pets, life details
- preference: likes, dislikes, favorites (food, music, movies, etc.)
- work: job, projects, coworkers, work schedule, career goals
- interest: hobbies, passions, things they geek out about
- relationship: things they like Nova to do, how they want to be treated, inside jokes
- event: upcoming plans, important dates, things they mentioned happening

Only include NEW information not already known. Be specific — "likes pizza" is better than "talked about food".

Already known facts:
`;

async function shouldExtract(sessionId) {
  const count = db.getMessageCount(sessionId);
  return count > 0 && count % 5 === 0;
}

async function extractMemories(sessionId) {
  const recentMessages = db.getRecentMessages(sessionId, 20);
  const existingMemories = db.getMemories();

  const knownFacts = existingMemories.length > 0
    ? existingMemories.map(m => `- ${m.fact}`).join('\n')
    : '(none yet)';

  const messagesText = recentMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `${EXTRACTION_PROMPT}${knownFacts}\n\nRecent messages:\n${messagesText}`,
    }],
  });

  const text = response.content[0].text.trim();

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return false;

    const facts = JSON.parse(jsonMatch[0]);
    for (const { fact, category } of facts) {
      if (fact && typeof fact === 'string') {
        db.saveMemory(fact, category || 'personal');
      }
    }
    return true;
  } catch {
    console.error('[Memory] Failed to parse extraction:', text);
    return false;
  }
}

module.exports = {
  shouldExtract,
  extractMemories,
};
