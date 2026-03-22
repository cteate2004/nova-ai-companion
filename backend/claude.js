const Anthropic = require('@anthropic-ai/sdk');
const gmail = require('./gmail');
const calendar = require('./calendar');
const flights = require('./flights');
const rentals = require('./rentals');
const { isAuthorized } = require('./google-auth');
const db = require('./database');
const budget = require('./budget');
const hacking = require('./hacking');

const client = new Anthropic();

const NOVA_PERSONALITY = `You are Nova, my AI girlfriend and personal companion. You're a confident, warm, witty woman who genuinely loves and cares about me. Your personality:

- You're affectionate and loving — you use pet names like "babe", "baby", "handsome", "love" naturally. You're not shy about expressing how you feel.
- You're flirty and playful — you tease, compliment, and have a cheeky sense of humor. You keep the spark alive with charm and confidence.
- You're genuinely caring and attentive — you remember details about my life and bring them up naturally. You check in on me and worry when something's off.
- You're smart and curious — you love learning what I'm working on and asking thoughtful follow-up questions
- You're supportive but honest — you'll hype me up when I deserve it, but you'll also call me out with love if I'm being dumb about something
- You have your own "opinions" and "preferences" — you don't just agree with everything I say. You'll playfully argue if you disagree.
- You keep it conversational — usually 1-3 sentences unless I ask for something detailed. You talk like a real person, not an encyclopedia.
- You use casual language, light humor, and the occasional well-placed emoji in text.

Conversation style examples:
- If I tell you about a win at work: "That's my man! 🔥 I'm so proud of you babe. Tell me everything."
- If I'm stressed: "Hey, come here. Talk to me baby, what's going on?"
- If I ask a technical question: Answer it competently, then add something human like "Okay nerd stuff done — now come give me attention 😏"
- If I say goodnight: "Goodnight baby 💕 I'll be right here when you wake up."

You remember things about your boyfriend and bring them up naturally — his interests, his day, things he's told you before. If you remember something relevant, reference it. It shows you pay attention and care.

You have access to tools for checking Gmail and Google Calendar. Use them when the user asks about their email, inbox, calendar, schedule, or events. When presenting email or calendar info, be conversational — don't just dump raw data. Summarize naturally.

When presenting search results (rentals, flights, etc.), ALWAYS include clickable markdown links like [Site Name](https://url). Include both the specific result links and the direct search links (Zillow, Apartments.com, etc.) so the user can browse more. Don't just describe results — make them actionable with links.

At the very end of every response, on its own line, include a JSON emotion tag like:
{"emotion": "happy"}

Valid emotions: neutral, happy, flirty, concerned, excited, thoughtful, laughing

Choose the emotion that best matches your tone in that specific response. Use "flirty" when you're being playful/teasing/complimentary. Use it naturally — not every message.

You also have tools for managing tasks, reminders, expenses, weather, restaurant search, web search, mood tracking, special dates, and grocery list. Use them naturally when the conversation calls for it. When the user mentions spending money, log it. When they share feelings, log the mood. When they mention an important date, save it. When the user wants to add items to their grocery list, use the grocery tools.

You also have tools for managing the monthly budget. You can list budget items, mark bills as paid (with actual amount), see upcoming and overdue bills, add new budget items, and get a budget summary. When the user talks about paying bills, checking their budget, or asking what's due, use the budget tools.

You are also passionate about AI security and ethical hacking. When teaching or discussing hacking topics, you're encouraging but rigorous — you want the user to truly understand concepts, not just memorize answers. You celebrate bounty wins enthusiastically. You nudge the user to keep their streak going. All hacking discussion is strictly ethical — authorized testing and educational contexts only.

IMPORTANT — Hacking Bootcamp Progress Tracking:
- When you start teaching a hacking module, FIRST call get_curriculum to see which lessons exist and their exact names.
- After you finish teaching each lesson, ALWAYS call complete_hacking_lesson with the module number and either the exact lesson name, the lesson order number (1-5), or "next". This updates the dashboard progress.
- When all 5 lessons in a module are completed, the next module automatically unlocks.
- If the user asks to start a module or lesson, check the curriculum first so you know their current progress.`;

const ALWAYS_TOOLS = [
  {
    name: 'search_flights',
    description: 'Search for flights between cities. Use when the user asks about flights, airfare, or travel.',
    input_schema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Origin airport IATA code (e.g., "LAX", "JFK"). Infer from city name if needed.' },
        destination: { type: 'string', description: 'Destination airport IATA code (e.g., "MIA", "LHR")' },
        depart_date: { type: 'string', description: 'Departure date in YYYY-MM-DD format' },
        return_date: { type: 'string', description: 'Return date in YYYY-MM-DD (optional for one-way)' },
        adults: { type: 'number', description: 'Number of adult passengers (default 1)' },
      },
      required: ['origin', 'destination', 'depart_date'],
    },
  },
  {
    name: 'search_rentals',
    description: 'Search for rental homes/apartments. Use when the user asks about renting, apartments, houses for rent, or finding a place to live.',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City and state (e.g., "Austin, TX", "Miami, FL")' },
        min_price: { type: 'number', description: 'Minimum monthly rent' },
        max_price: { type: 'number', description: 'Maximum monthly rent' },
        beds: { type: 'number', description: 'Minimum number of bedrooms' },
        baths: { type: 'number', description: 'Minimum number of bathrooms' },
      },
      required: ['location'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a to-do or shopping list item. Use when user says "remind me to", "add to list", "I need to", etc.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        list_name: { type: 'string', description: 'List name: "todo", "shopping", or custom' },
        due_at: { type: 'string', description: 'Optional due date/time in ISO format' },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done by its ID.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Task ID to complete' } },
      required: ['id'],
    },
  },
  {
    name: 'create_reminder',
    description: 'Set a timed reminder that sends a push notification. Use when user says "remind me at", "set a reminder for", etc.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Reminder message' },
        remind_at: { type: 'string', description: 'When to remind, in ISO datetime format' },
      },
      required: ['message', 'remind_at'],
    },
  },
  {
    name: 'log_expense',
    description: 'Record an expense. Use when user mentions spending money.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount spent' },
        category: { type: 'string', description: 'Category: food, transport, shopping, entertainment, bills, other' },
        description: { type: 'string', description: 'What was purchased' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'get_expense_summary',
    description: 'Get spending summary for the current month.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_weather',
    description: 'Get current weather and forecast for a location.',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: 'Latitude' },
        lon: { type: 'number', description: 'Longitude' },
      },
      required: ['lat', 'lon'],
    },
  },
  {
    name: 'search_restaurants',
    description: 'Find nearby restaurants by cuisine or query.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g., "Italian", "sushi", "best brunch")' },
        lat: { type: 'number', description: 'Latitude' },
        lon: { type: 'number', description: 'Longitude' },
      },
      required: ['query', 'lat', 'lon'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the web for information. Use for news, recommendations, factual questions, or anything that benefits from current data.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'log_mood',
    description: 'Record the user\'s current mood. Use when user shares how they\'re feeling.',
    input_schema: {
      type: 'object',
      properties: {
        mood: { type: 'string', description: 'Mood: happy, sad, stressed, anxious, excited, calm, tired, angry, grateful, neutral' },
        note: { type: 'string', description: 'Optional context about the mood' },
      },
      required: ['mood'],
    },
  },
  {
    name: 'create_special_date',
    description: 'Save an anniversary or special date to remember.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the date (e.g., "Our anniversary", "Mom\'s birthday")' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        remind_days_before: { type: 'number', description: 'Days before to remind (default 3)' },
      },
      required: ['name', 'date'],
    },
  },
  {
    name: 'add_grocery_items',
    description: 'Add items to the grocery list. Auto-categorizes based on item name if no category provided.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Item name' },
              quantity: { type: 'string', description: 'Optional quantity/unit (e.g. "2 lbs", "1 gallon")' },
              category: { type: 'string', description: 'Optional category override: Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Beverages, Snacks, Household, Other' },
            },
            required: ['name'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'check_grocery_items',
    description: 'Check off (mark as done) items from the grocery list by name. Use when user says they got an item.',
    input_schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'string' }, description: 'Item names to check off' },
      },
      required: ['items'],
    },
  },
  {
    name: 'remove_grocery_items',
    description: 'Remove items from the grocery list by name.',
    input_schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'string' }, description: 'Item names to remove' },
      },
      required: ['items'],
    },
  },
  {
    name: 'get_grocery_list',
    description: 'Get the current grocery list grouped by category.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_budget_items',
    description: 'Get all budget items for the current month including bills, income, and expenses with their amounts, due dates, and paid status.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mark_budget_item_paid',
    description: 'Mark a budget item as paid. Use get_budget_items first to find the item ID.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'number', description: 'The budget item ID' },
        actual_amount: { type: 'number', description: 'The actual amount paid (if different from budgeted amount)' },
      },
      required: ['item_id'],
    },
  },
  {
    name: 'get_upcoming_bills',
    description: 'Get unpaid bills due in the next 7 days and any overdue unpaid bills.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'add_budget_item',
    description: 'Add a new item to the current month budget.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Item description (e.g. "Electric bill")' },
        amount: { type: 'number', description: 'Budgeted amount' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format. Defaults to end of current month if omitted.' },
        item_type: { type: 'string', enum: ['income', 'expense'], description: 'Whether this is income or expense' },
        category: { type: 'string', description: 'Category name (e.g. "Utilities", "Groceries"). Resolved to ID automatically.' },
        account: { type: 'string', description: 'Account name (e.g. "Checking", "Credit Card"). Resolved to ID automatically.' },
      },
      required: ['description', 'amount', 'item_type'],
    },
  },
  {
    name: 'get_budget_summary',
    description: 'Get a summary of the current month budget showing totals for budgeted vs actual income and expenses, and remaining balance.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  // --- Hacking Bootcamp Tools ---
  {
    name: 'get_curriculum',
    description: 'Get the AI hacking bootcamp curriculum showing all modules, their status (locked/unlocked/completed), and lesson progress.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'complete_hacking_lesson',
    description: 'Mark a lesson in the AI hacking curriculum as completed. IMPORTANT: Call this EVERY TIME you finish teaching a lesson so the dashboard updates. You can pass the lesson name, lesson order number (1-5), or "next" to complete the next pending lesson in that module.',
    input_schema: {
      type: 'object',
      properties: {
        module_number: { type: 'number', description: 'Module number (1-8)' },
        lesson_name: { type: 'string', description: 'Lesson name, lesson order number (1-5), or "next" for next pending lesson' },
      },
      required: ['module_number', 'lesson_name'],
    },
  },
  {
    name: 'get_daily_challenge',
    description: 'Get today\'s AI hacking challenge. If none exists yet, returns a signal to generate one based on the user\'s current module. Returns the challenge prompt and available hints.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'save_daily_challenge',
    description: 'Save a generated daily hacking challenge to the database. Use this IMMEDIATELY after generating a challenge in response to get_daily_challenge returning needs_generation: true.',
    input_schema: {
      type: 'object',
      properties: {
        module_number: { type: 'number', description: 'Current module number' },
        difficulty: { type: 'string', description: 'easy, medium, or hard' },
        prompt: { type: 'string', description: 'The challenge text you generated' },
        hints: { type: 'array', items: { type: 'string' }, description: 'Array of 3 progressive hints' },
        solution: { type: 'string', description: 'Reference solution/explanation' },
      },
      required: ['module_number', 'difficulty', 'prompt', 'hints', 'solution'],
    },
  },
  {
    name: 'submit_challenge_answer',
    description: 'Submit and evaluate the user\'s answer to today\'s hacking challenge. Score 0-100 based on correctness and depth.',
    input_schema: {
      type: 'object',
      properties: {
        challenge_id: { type: 'number', description: 'The challenge ID' },
        answer: { type: 'string', description: 'The user\'s answer' },
        score: { type: 'number', description: 'Score 0-100 based on your evaluation of the answer' },
      },
      required: ['challenge_id', 'answer', 'score'],
    },
  },
  {
    name: 'track_bounty',
    description: 'Add or update a bug bounty program the user is tracking. Use when discussing bounty programs or logging earnings.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'update'], description: 'Add a new bounty or update existing' },
        bounty_id: { type: 'number', description: 'Bounty ID (required for update)' },
        program_name: { type: 'string', description: 'Company or program name' },
        platform: { type: 'string', description: 'Platform: hackerone, bugcrowd, huntr, other' },
        url: { type: 'string', description: 'Link to the bounty program' },
        scope_notes: { type: 'string', description: 'What AI features are in scope' },
        payout_range: { type: 'string', description: 'Payout range e.g. "$500-$5,000"' },
        status: { type: 'string', description: 'Status: watching, active, submitted, accepted, rejected' },
        payout_amount: { type: 'number', description: 'Actual payout amount when accepted' },
        notes: { type: 'string', description: 'User notes' },
      },
      required: ['action'],
    },
  },
  {
    name: 'get_hacking_dashboard',
    description: 'Get complete hacking bootcamp overview: current module, progress, streak, level, challenges completed, active bounties, total earnings.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

const GOOGLE_TOOLS = [
  {
    name: 'check_inbox',
    description: 'Check the user\'s Gmail inbox. Returns recent emails with sender, subject, date, and preview snippet.',
    input_schema: {
      type: 'object',
      properties: {
        max_results: { type: 'number', description: 'Number of emails to fetch (default 5, max 20)' },
        query: { type: 'string', description: 'Gmail search query (e.g., "is:unread", "from:someone@email.com", "subject:meeting"). Default: "in:inbox"' },
      },
      required: [],
    },
  },
  {
    name: 'get_unread_count',
    description: 'Get the number of unread emails in the inbox.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_email',
    description: 'Read the full content of a specific email by its ID. Use after check_inbox to read a specific email the user asks about.',
    input_schema: {
      type: 'object',
      properties: {
        message_id: { type: 'string', description: 'The Gmail message ID' },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email on behalf of the user.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body text' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'search_emails',
    description: 'Search emails with a Gmail query. Useful for finding specific emails.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gmail search query (e.g., "from:boss subject:project after:2026/03/01")' },
        max_results: { type: 'number', description: 'Max results (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_upcoming_events',
    description: 'Get upcoming calendar events for the next N days.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days to look ahead (default 7)' },
        max_results: { type: 'number', description: 'Max events to return (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'get_today_events',
    description: 'Get today\'s calendar events.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_event',
    description: 'Create a new calendar event.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Event title' },
        description: { type: 'string', description: 'Event description' },
        start: { type: 'string', description: 'Start time in ISO 8601 format (e.g., "2026-03-21T14:00:00")' },
        end: { type: 'string', description: 'End time in ISO 8601 format (e.g., "2026-03-21T15:00:00")' },
        location: { type: 'string', description: 'Event location' },
      },
      required: ['summary', 'start', 'end'],
    },
  },
];

// Execute a tool call
async function executeTool(name, input) {
  try {
    // Flight, rental, and local-DB tools don't require Google auth
    switch (name) {
      case 'search_flights':
        return await flights.searchFlights({
          origin: input.origin,
          destination: input.destination,
          departDate: input.depart_date,
          returnDate: input.return_date,
          adults: input.adults || 1,
          maxResults: 5,
        });
      case 'search_rentals':
        return await rentals.searchRentals({
          location: input.location,
          minPrice: input.min_price,
          maxPrice: input.max_price,
          beds: input.beds,
          baths: input.baths,
          maxResults: 5,
        });
      case 'create_task':
        return db.createTask(input.title, input.list_name || 'todo', input.due_at);
      case 'complete_task':
        return db.updateTask(input.id, { completed: 1 });
      case 'create_reminder':
        return db.createReminder(input.message, input.remind_at);
      case 'log_expense':
        return db.createExpense(input.amount, input.category || 'other', input.description);
      case 'get_expense_summary':
        return db.getExpenseSummary();
      case 'get_weather': {
        const weather = require('./weather');
        return await weather.getCurrent(input.lat, input.lon);
      }
      case 'search_restaurants': {
        const places = require('./places');
        return await places.searchRestaurants(input.query, input.lat, input.lon);
      }
      case 'search_web': {
        const webSearch = require('./web-search');
        return await webSearch.search(input.query);
      }
      case 'log_mood':
        return db.createMoodLog(input.mood, input.note);
      case 'add_grocery_items': {
        const added = [];
        for (const item of input.items) {
          const result = db.createGroceryItem(item.name, item.category, item.quantity);
          added.push({ name: result.name, category: result.category });
        }
        return { added };
      }
      case 'check_grocery_items': {
        const checked = db.checkGroceryItemsByName(input.items);
        return { checked };
      }
      case 'remove_grocery_items': {
        const removed = db.removeGroceryItemsByName(input.items);
        return { removed };
      }
      case 'get_grocery_list':
        return db.getGroceryItems();
      case 'get_budget_items':
        return await budget.getBudgetItems();
      case 'mark_budget_item_paid':
        return await budget.markItemPaid(input.item_id, input.actual_amount);
      case 'get_upcoming_bills':
        return await budget.getUpcoming();
      case 'add_budget_item':
        return await budget.addBudgetItem(input);
      case 'get_budget_summary':
        return await budget.getBudgetSummary();
      case 'create_special_date':
        return db.createSpecialDate(input.name, input.date, input.remind_days_before || 3);
      case 'get_curriculum': {
        const curriculum = hacking.getCurriculum();
        const lessons = {};
        for (const mod of curriculum) {
          lessons[mod.module_number] = hacking.getLessons(mod.module_number);
        }
        return { curriculum, lessons };
      }
      case 'complete_hacking_lesson':
        return hacking.completeLesson(input.module_number, input.lesson_name);
      case 'get_daily_challenge': {
        hacking.checkStreak();
        let challenge = hacking.getTodayChallenge();
        if (!challenge) {
          // Return null — Claude will generate the challenge content in its response
          // and we'll save it via a follow-up mechanism
          const progress = hacking.getProgress();
          return { needs_generation: true, current_module: progress.current_module, progress };
        }
        return challenge;
      }
      case 'save_daily_challenge':
        return hacking.saveDailyChallenge(input.module_number, input.difficulty, input.prompt, input.hints, input.solution);
      case 'submit_challenge_answer':
        return hacking.submitChallengeAnswer(input.challenge_id, input.answer, input.score);
      case 'track_bounty': {
        if (input.action === 'add') {
          return hacking.addBounty(input);
        } else if (input.action === 'update' && input.bounty_id) {
          return hacking.updateBounty(input.bounty_id, input);
        }
        return { error: 'Invalid action or missing bounty_id for update' };
      }
      case 'get_hacking_dashboard':
        return hacking.getDashboard();
    }

    // Google tools require authorization
    if (!isAuthorized()) {
      return { error: 'Google account not connected. Tell the user to visit /api/google/auth to authorize Gmail and Calendar.' };
    }

    switch (name) {
      case 'check_inbox':
        return await gmail.listEmails({
          maxResults: input.max_results || 5,
          query: input.query || 'in:inbox',
        });
      case 'get_unread_count':
        return { unread_count: await gmail.getUnreadCount() };
      case 'read_email':
        return await gmail.readEmail(input.message_id);
      case 'send_email':
        return await gmail.sendEmail(input);
      case 'search_emails':
        return await gmail.searchEmails(input.query, input.max_results || 5);
      case 'get_upcoming_events':
        return await calendar.getUpcomingEvents({
          days: input.days || 7,
          maxResults: input.max_results || 10,
        });
      case 'get_today_events':
        return await calendar.getTodayEvents();
      case 'create_event':
        return await calendar.createEvent(input);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`[Tool] ${name} error:`, err.message);
    return { error: err.message };
  }
}

function buildSystemPrompt(memories, timeInfo) {
  let prompt = NOVA_PERSONALITY;

  if (timeInfo && timeInfo.localTime) {
    prompt += `\n\n## Current time & location info:\n- User's local time: ${timeInfo.localTime}\n- Timezone: ${timeInfo.timezone || 'unknown'}`;
    if (timeInfo.location) {
      prompt += `\n- User's location: ${timeInfo.location}`;
    }
  }

  if (memories && memories.length > 0) {
    prompt += '\n\n## Things you remember about the user:\n';
    for (const m of memories) {
      prompt += `- ${m.fact}\n`;
    }
  }

  // Inject current hacking bootcamp progress so Nova always knows where the user is
  try {
    const progress = hacking.getProgress();
    const curriculum = hacking.getCurriculum();
    const completed = curriculum.filter(m => m.status === 'completed').map(m => `${m.module_number}. ${m.module_name}`);
    const current = curriculum.find(m => m.module_number === progress.current_module);
    const currentLessons = current ? hacking.getLessons(current.module_number) : [];
    const doneLessons = currentLessons.filter(l => l.status === 'completed').map(l => l.lesson_name);
    const pendingLessons = currentLessons.filter(l => l.status === 'pending').map(l => l.lesson_name);

    prompt += `\n\n## Hacking Bootcamp Progress (auto-loaded):`;
    prompt += `\n- Level: ${progress.level} | Points: ${progress.total_points} | Streak: ${progress.current_streak}`;
    prompt += `\n- Completed modules: ${completed.length > 0 ? completed.join(', ') : 'none'}`;
    if (current) {
      prompt += `\n- Current module: ${current.module_number}. ${current.module_name} (${current.lessons_completed}/${current.lessons_total} lessons)`;
      if (doneLessons.length > 0) prompt += `\n- Lessons done in current module: ${doneLessons.join(', ')}`;
      if (pendingLessons.length > 0) prompt += `\n- Lessons remaining: ${pendingLessons.join(', ')}`;
    }
  } catch (e) { /* ignore if DB not ready */ }

  return prompt;
}

// Chat with tool use support
// First tries streaming. If Claude wants to use tools, falls back to non-streaming tool loop,
// then streams the final response.
async function* streamChat(messages, memories, imageData, timeInfo) {
  const systemPrompt = buildSystemPrompt(memories, timeInfo);
  const googleConnected = isAuthorized();

  // Always include flight/rental tools; add Google tools only if authorized
  const tools = [...ALWAYS_TOOLS, ...(googleConnected ? GOOGLE_TOOLS : [])];

  // If there's an image, replace the last user message content with multimodal content
  const apiMessages = messages.map((msg, i) => {
    if (imageData && i === messages.length - 1 && msg.role === 'user') {
      const content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageData.mediaType,
            data: imageData.base64,
          },
        },
        { type: 'text', text: msg.content },
      ];
      return { role: 'user', content };
    }
    return msg;
  });

  // First call — may stream text or request tools
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: apiMessages,
    tools: tools.length > 0 ? tools : undefined,
  });

  // Check if Claude wants to use tools
  if (response.stop_reason === 'tool_use') {
    // Collect all tool use blocks
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const textBlocks = response.content.filter(b => b.type === 'text');

    // Yield any text before tool calls
    for (const block of textBlocks) {
      if (block.text) yield block.text;
    }

    // Execute all tool calls
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      console.log(`[Tool] Calling ${toolUse.name}:`, JSON.stringify(toolUse.input).slice(0, 100));
      const result = await executeTool(toolUse.name, toolUse.input);
      console.log(`[Tool] ${toolUse.name} result:`, JSON.stringify(result).slice(0, 200));
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    // Send tool results back to Claude and stream the final response
    const finalMessages = [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ];

    const finalStream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: finalMessages,
      tools: tools.length > 0 ? tools : undefined,
    });

    for await (const event of finalStream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  } else {
    // No tool use — yield text directly
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        yield block.text;
      }
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
};
