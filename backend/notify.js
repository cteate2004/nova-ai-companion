/**
 * Push notifications via ntfy.sh
 * Install the ntfy app on your iPhone, subscribe to your topic, and you're set.
 */

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'nova-companion';

/**
 * Send a push notification via ntfy.sh
 */
async function sendNotification(title, message) {
  const url = `https://ntfy.sh/${NTFY_TOPIC}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Title': title,
      'Content-Type': 'text/plain',
    },
    body: message,
  });

  if (!res.ok) {
    throw new Error(`ntfy.sh returned ${res.status}: ${await res.text()}`);
  }

  console.log(`[Notify] Sent: "${title}" → ${NTFY_TOPIC}`);
  return { success: true, topic: NTFY_TOPIC };
}

/**
 * Check if notifications are configured (NTFY_TOPIC set in .env)
 */
function isConfigured() {
  return !!process.env.NTFY_TOPIC;
}

module.exports = { sendNotification, isConfigured };
