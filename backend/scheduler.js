const cron = require('node-cron');
const db = require('./database');
const push = require('./push');
const hacking = require('./hacking');

const USER_TIMEZONE = process.env.USER_TIMEZONE || 'America/Los_Angeles';

function getNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: USER_TIMEZONE }));
}

function start() {
  console.log(`[Scheduler] Using timezone: ${USER_TIMEZONE}`);

  // Check for due reminders every 60 seconds
  cron.schedule('* * * * *', async () => {
    try {
      const allReminders = db.getReminders(false);
      const now = getNow();
      if (allReminders.length > 0) {
        console.log(`[Scheduler] Reminder sent values:`, allReminders.map(r => `id${r.id}:sent=${r.sent}(${typeof r.sent})`).join(', '));
      }
      const reminders = allReminders.filter(r => !r.sent);
      console.log(`[Scheduler] Tick — ${reminders.length} pending (${allReminders.length} total), ${db.getPushSubscriptions().length} push sub(s), PST: ${now.toLocaleTimeString()}`);

      for (const r of reminders) {
        const remindAt = new Date(r.remind_at);
        if (remindAt <= now) {
          await push.sendToAll('Nova 💜', r.message);
          db.markReminderSent(r.id);
          console.log(`[Scheduler] Sent reminder: ${r.message}`);
        }
      }
    } catch (e) {
      console.error('[Scheduler] Reminder check error:', e.message);
    }
  });

  // Check for scheduled messages every minute
  cron.schedule('* * * * *', async () => {
    try {
      const schedules = db.getScheduledMessages();
      const now = getNow();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      console.log(`[Scheduler] Scheduled msgs check — now=${currentTime}, ${schedules.length} schedule(s): ${schedules.map(s => `${s.type}@${s.time}(enabled=${s.enabled},last_sent=${s.last_sent})`).join(', ')}`);

      for (const s of schedules) {
        if (!s.enabled) continue;

        const today = now.toISOString().split('T')[0];
        if (s.last_sent === today) continue;

        // Fire if current time matches OR if we've passed the scheduled time (catch missed windows)
        if (currentTime < s.time) continue;

        let message;
        if (s.type === 'good_morning') {
          message = 'Good morning! ☀️ Hope you have an amazing day. I\'m here whenever you need me 💜';
        } else if (s.type === 'good_night') {
          message = 'Goodnight! 💜 Rest up. I\'ll be right here when you need me.';
        }

        if (message) {
          await push.sendToAll('Nova 💜', message);
          db.updateScheduledMessage(s.id, { last_sent: today });
          console.log(`[Scheduler] Sent ${s.type} message at ${currentTime} ${USER_TIMEZONE}`);
        }
      }
    } catch (e) {
      console.error('[Scheduler] Scheduled message error:', e.message);
    }
  });

  // "Thinking of you" nudges — check every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const hour = getNow().getHours();
      if (hour < 8 || hour >= 22) return;

      if (Math.random() > 0.06) return;

      const nudges = [
        'Hey! Just checking in 💜',
        'Hope your day is going well 😊',
        'Quick reminder: you\'re doing great 💪',
        'Hey! What are you up to? 😊',
      ];
      const msg = nudges[Math.floor(Math.random() * nudges.length)];
      await push.sendToAll('Nova 💜', msg);
      console.log(`[Scheduler] Sent nudge: ${msg}`);
    } catch (e) {
      console.error('[Scheduler] Nudge error:', e.message);
    }
  });

  // Daily hacking challenge teaser — 3:00 AM PST
  cron.schedule('0 3 * * *', async () => {
    try {
      const hour = getNow().getHours();
      // Safety check: only fire between 2-4 AM
      if (hour < 2 || hour > 4) return;

      const progress = hacking.getProgress();
      const teasers = [
        'Your daily AI hacking challenge is ready. Come get it 💜',
        'New challenge dropped! Ready to level up? 🔥',
        'Hey, your daily challenge is waiting 💻',
        'Time to hack! Today\'s challenge is ready for you 🔥',
      ];
      const msg = teasers[Math.floor(Math.random() * teasers.length)];
      await push.sendToAll('Nova \u{1F49C}', msg);
      console.log(`[Scheduler] Sent daily hacking challenge teaser (module ${progress.current_module})`);
    } catch (e) {
      console.error('[Scheduler] Hacking challenge teaser error:', e.message);
    }
  });

  // Weekly hacking progress recap — Sunday 10:00 AM PST
  cron.schedule('0 10 * * 0', async () => {
    try {
      const hour = getNow().getHours();
      const day = getNow().getDay();
      if (day !== 0 || hour < 9 || hour > 11) return;

      const dashboard = hacking.getDashboard();
      const p = dashboard.progress;
      const msg = `Weekly hack recap: ${p.current_streak} day streak, ${p.total_challenges_completed} challenges done, Level: ${p.level}. Keep grinding! 💪`;
      await push.sendToAll('Nova \u{1F49C}', msg);
      console.log('[Scheduler] Sent weekly hacking recap');
    } catch (e) {
      console.error('[Scheduler] Hacking recap error:', e.message);
    }
  });

  // Weekly bounty program search — Wednesday 12:00 PM PST
  cron.schedule('0 12 * * 3', async () => {
    try {
      const hour = getNow().getHours();
      const day = getNow().getDay();
      if (day !== 3 || hour < 11 || hour > 13) return;

      const webSearch = require('./web-search');
      const results = await webSearch.search('new AI LLM bug bounty program 2026', 5);
      if (results && results.length > 0 && !results.error) {
        const msg = `Found ${results.length} potential new AI bounty programs! Ask me about them \u{1F440}`;
        await push.sendToAll('Nova \u{1F49C}', msg);
        console.log('[Scheduler] Sent bounty search alert');
      }
    } catch (e) {
      console.error('[Scheduler] Bounty search error:', e.message);
    }
  });

  console.log('[Scheduler] Started');
}

module.exports = { start };
