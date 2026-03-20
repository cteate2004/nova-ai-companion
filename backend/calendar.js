/**
 * Google Calendar service — reads upcoming events from ALL calendars
 * (primary, shared, subscribed, holidays, etc.)
 */

const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

/**
 * Get all calendar IDs the user has access to
 */
async function getAllCalendarIds() {
  const auth = await getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.calendarList.list();
  if (!res.data.items) return ['primary'];

  return res.data.items.map(cal => ({
    id: cal.id,
    name: cal.summary || cal.id,
    primary: cal.primary || false,
  }));
}

/**
 * Get upcoming events from ALL calendars
 * @param {number} days - Number of days to look ahead
 * @param {number} maxResults - Max events per calendar
 * @returns {Array} Simplified event objects, sorted by start time
 */
async function getUpcomingEvents(days = 1, maxResults = 10) {
  const auth = await getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  // Get all calendars
  const calendars = await getAllCalendarIds();
  const allEvents = [];

  // Query each calendar
  for (const cal of calendars) {
    try {
      const res = await calendar.events.list({
        calendarId: cal.id,
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      if (res.data.items) {
        for (const event of res.data.items) {
          allEvents.push({
            id: event.id,
            summary: event.summary || '(No title)',
            description: event.description || '',
            location: event.location || '',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            allDay: !event.start.dateTime,
            calendar: cal.name,
          });
        }
      }
    } catch (err) {
      // Skip calendars we can't read (e.g. permission issues)
      console.log(`[Calendar] Skipped "${cal.name}": ${err.message}`);
    }
  }

  // Sort all events by start time
  allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

  return allEvents;
}

/**
 * Get today's events from all calendars
 */
async function getTodayEvents() {
  return getUpcomingEvents(1, 20);
}

/**
 * Get this week's events from all calendars
 */
async function getWeekEvents() {
  return getUpcomingEvents(7, 30);
}

module.exports = { getUpcomingEvents, getTodayEvents, getWeekEvents };
