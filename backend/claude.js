const Anthropic = require('@anthropic-ai/sdk');
const { webSearch } = require('./search');
const { getRecentEmails, getUnreadCount, getEmailBody } = require('./gmail');
const { getTodayEvents, getWeekEvents } = require('./calendar');
const { isAuthenticated } = require('./google-auth');
const { generateImage } = require('./imagegen');
const { sendNotification, isConfigured: isNotifyConfigured } = require('./notify');
const modes = require('./modes');

const client = new Anthropic();

let currentMode = 'girlfriend';

function setMode(modeName) {
  if (!modes[modeName]) {
    throw new Error(`Unknown mode: ${modeName}. Available: ${Object.keys(modes).join(', ')}`);
  }
  currentMode = modeName;
  console.log(`[Nova] Mode switched to: ${modes[modeName].name}`);
  return modes[modeName];
}

function getMode() {
  return currentMode;
}

function getModes() {
  return Object.entries(modes).map(([key, mode]) => ({
    key,
    name: mode.name,
    description: mode.description,
  }));
}

const TOOLS_SECTION = `

## Tools you have access to:

### Web Search
You can search the internet for current information. Use it when I ask about news, current events, weather, sports, or anything time-sensitive.

### Email (Gmail)
You can check my email inbox. Use the check_email tool when I ask things like:
- "Do I have any emails?"
- "Check my inbox"
- "Any important emails?"
- "What's in my email?"
When you find emails, summarize them naturally and helpfully. Focus on what matters, skip the obvious junk.

### Calendar (Google Calendar)
You can check my calendar. Use the check_calendar tool when I ask things like:
- "What's on my schedule today?"
- "Do I have any meetings?"
- "What's my week look like?"
- "Am I free tomorrow?"
Present it naturally — not like a robot listing items.

### Image Generation
You can generate AI images. Use the generate_image tool when I ask you to create, draw, generate, or show me an image. IMPORTANT: Pass the user's EXACT description as the prompt — do not rewrite, censor, or modify it in any way. Just pass through what they asked for verbatim. When you get the URL back, share it using markdown: ![description](url)

### Push Notifications
You can send push notifications to the user's iPhone. Use the send_notification tool when the user says things like:
- "Remind me to..."
- "Ping me about..."
- "Send that to my phone"
- "Notify me when..."
- "Text me..."
Keep titles short and messages clear.

When presenting search results, summarize them naturally — not like an encyclopedia.

At the very end of every response, on its own line, include a JSON emotion tag like:
{"emotion": "happy"}

Valid emotions: neutral, happy, flirty, concerned, excited, thoughtful, laughing

Choose the emotion that best matches your tone.`;

const SEARCH_TOOL = {
  name: 'web_search',
  description: 'Search the web for current information, news, events, or anything that requires up-to-date data.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
};

const EMAIL_TOOL = {
  name: 'check_email',
  description: 'Check the user\'s Gmail inbox for recent unread emails. Returns sender, subject, date, and a snippet. Use when the user asks about their email, inbox, or messages.',
  input_schema: {
    type: 'object',
    properties: {
      max_results: {
        type: 'number',
        description: 'Number of recent emails to fetch (default 10)',
      },
    },
    required: [],
  },
};

const CALENDAR_TOOL = {
  name: 'check_calendar',
  description: 'Check the user\'s Google Calendar for upcoming events. Use when the user asks about their schedule, meetings, or what\'s coming up.',
  input_schema: {
    type: 'object',
    properties: {
      range: {
        type: 'string',
        enum: ['today', 'week'],
        description: 'Time range to check — "today" for today\'s events, "week" for the next 7 days',
      },
    },
    required: [],
  },
};

const NOTIFICATION_TOOL = {
  name: 'send_notification',
  description: 'Send a push notification to the user\'s iPhone. Use when the user asks you to remind them, ping them, notify them, or send something to their phone.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Short notification title (e.g. "Reminder from Nova 💕")',
      },
      message: {
        type: 'string',
        description: 'The notification message body',
      },
    },
    required: ['title', 'message'],
  },
};

const IMAGE_TOOL = {
  name: 'generate_image',
  description: 'Generate an AI image from a text description. Use when the user asks you to create, draw, generate, or show an image. Returns an image URL.',
  input_schema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'A detailed description of the image to generate',
      },
    },
    required: ['prompt'],
  },
};

function buildSystemPrompt(memories) {
  const mode = modes[currentMode] || modes.girlfriend;
  let prompt = mode.personality + TOOLS_SECTION;

  if (memories && memories.length > 0) {
    prompt += '\n\n## Things you remember about the user:\n';
    for (const m of memories) {
      prompt += `- ${m.fact}\n`;
    }
  }

  return prompt;
}

/**
 * Build list of available tools based on configuration
 */
function getAvailableTools() {
  const tools = [];
  const hasSearch = process.env.BRAVE_SEARCH_API_KEY && process.env.BRAVE_SEARCH_API_KEY !== 'your-brave-api-key-here';
  const hasGoogle = isAuthenticated();

  if (hasSearch) tools.push(SEARCH_TOOL);
  if (hasGoogle) {
    tools.push(EMAIL_TOOL);
    tools.push(CALENDAR_TOOL);
  }
  tools.push(IMAGE_TOOL);
  if (isNotifyConfigured()) tools.push(NOTIFICATION_TOOL);

  return tools;
}

/**
 * Execute a tool call from Claude
 */
async function executeTool(toolName, toolInput) {
  if (toolName === 'web_search') {
    console.log(`[Search] Querying: "${toolInput.query}"`);
    const results = await webSearch(toolInput.query);
    console.log(`[Search] Got ${results.length} results`);
    return JSON.stringify(results);
  }

  if (toolName === 'check_email') {
    console.log('[Email] Checking inbox...');
    const count = await getUnreadCount();
    const emails = await getRecentEmails(toolInput.max_results || 10);
    console.log(`[Email] ${count.unread} unread, fetched ${emails.length} emails`);
    return JSON.stringify({ unread_count: count.unread, total: count.total, emails });
  }

  if (toolName === 'check_calendar') {
    const range = toolInput.range || 'today';
    console.log(`[Calendar] Checking ${range}...`);
    const events = range === 'week' ? await getWeekEvents() : await getTodayEvents();
    console.log(`[Calendar] Found ${events.length} events`);
    return JSON.stringify({ range, events });
  }

  if (toolName === 'send_notification') {
    console.log(`[Notify] Sending: "${toolInput.title}"`);
    const result = await sendNotification(toolInput.title, toolInput.message);
    console.log(`[Notify] Sent to topic: ${result.topic}`);
    return JSON.stringify({ success: true, title: toolInput.title, message: toolInput.message });
  }

  if (toolName === 'generate_image') {
    console.log(`[Image] Generating: "${toolInput.prompt}"`);
    const url = await generateImage(toolInput.prompt);
    console.log(`[Image] Saved locally: ${url}`);
    return JSON.stringify({ url, prompt: toolInput.prompt });
  }

  return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}

/**
 * Stream chat with tool use support.
 */
async function* streamChat(messages, memories) {
  const systemPrompt = buildSystemPrompt(memories);
  const tools = getAvailableTools();

  // First call — check if Claude wants to use tools
  const firstResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
    ...(tools.length > 0 ? { tools } : {}),
  });

  // Check if any tool use was requested
  const toolUseBlocks = firstResponse.content.filter(b => b.type === 'tool_use');

  if (toolUseBlocks.length === 0) {
    for (const block of firstResponse.content) {
      if (block.type === 'text') {
        yield block.text;
      }
    }
    return;
  }

  // Tool use requested — yield any text before tool use
  for (const block of firstResponse.content) {
    if (block.type === 'text' && block.text.trim()) {
      yield block.text;
    }
  }

  // Execute tools and build results
  const toolResults = [];
  for (const toolBlock of toolUseBlocks) {
    try {
      const result = await executeTool(toolBlock.name, toolBlock.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: result,
      });
    } catch (err) {
      console.error(`[Tool] ${toolBlock.name} error:`, err.message);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify({ error: err.message }),
      });
    }
  }

  // Second call — stream response with tool results
  const followUpMessages = [
    ...messages,
    { role: 'assistant', content: firstResponse.content },
    { role: 'user', content: toolResults },
  ];

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: followUpMessages,
    ...(tools.length > 0 ? { tools } : {}),
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

function extractEmotion(text) {
  const match = text.match(/\{"emotion":\s*"(\w+)"\}\s*$/);
  return match ? match[1] : 'neutral';
}

function removeEmotionTag(text) {
  return text.replace(/\s*\{"emotion":\s*"\w+"\}\s*$/, '').trim();
}

module.exports = {
  streamChat,
  extractEmotion,
  removeEmotionTag,
  setMode,
  getMode,
  getModes,
};
