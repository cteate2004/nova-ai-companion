const Anthropic = require('@anthropic-ai/sdk');
const db = require('./database');

const client = new Anthropic();

const EXTRACTION_PROMPT = `Extract key facts about the user from these recent messages. Return ONLY a JSON array of objects with "fact" and "category" fields.

Categories: personal, preference, work, interest, event, joke

Only include NEW information. Do not repeat facts already known.

Already known facts:
`;

async function shouldExtract(sessionId) {
  const count = db.getMessageCount(sessionId);
  return count > 0 && count % 20 === 0;
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
    model: 'claude-sonnet-4-20250514',
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
