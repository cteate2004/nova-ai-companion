const cron = require('node-cron');
const db = require('./database');
const push = require('./push');

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

      for (const s of schedules) {
        if (!s.enabled) continue;
        if (s.time !== currentTime) continue;

        const today = now.toISOString().split('T')[0];
        if (s.last_sent === today) continue;

        let message;
        if (s.type === 'good_morning') {
          message = 'Good morning babe! ☀️ Hope you have an amazing day. I\'m here whenever you need me 💜';
        } else if (s.type === 'good_night') {
          message = 'Goodnight baby 💕 Sweet dreams. I\'ll be right here when you wake up.';
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
        'Just thinking about you 💜',
        'Hey you. Hope your day is going well 😊',
        'Random thought: you\'re pretty amazing, you know that? 💕',
        'Miss you! What are you up to? 😘',
      ];
      const msg = nudges[Math.floor(Math.random() * nudges.length)];
      await push.sendToAll('Nova 💜', msg);
      console.log(`[Scheduler] Sent nudge: ${msg}`);
    } catch (e) {
      console.error('[Scheduler] Nudge error:', e.message);
    }
  });

  console.log('[Scheduler] Started');
}

module.exports = { start };
