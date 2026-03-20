/**
 * Push notifications via ntfy.sh
 * Install the ntfy app on your iPhone, subscribe to your topic, and you're set.
 * Tapping the notification opens Nova in your browser.
 */

const os = require('os');

const NTFY_TOPIC = process.env.NTFY_TOPIC || 'nova-companion';

/**
 * Get the local network IP for the click-through URL
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

/**
 * Send a push notification via ntfy.sh
 * Tapping the notification opens Nova on the phone.
 */
async function sendNotification(title, message) {
  const url = `https://ntfy.sh/${NTFY_TOPIC}`;
  const novaUrl = `https://${getLocalIP()}:8000`;

  const body = `${message}\n\nReply to Nova: ${novaUrl}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Title': title,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`ntfy.sh returned ${res.status}: ${await res.text()}`);
  }

  console.log(`[Notify] Sent: "${title}" → ${NTFY_TOPIC} (click → ${novaUrl})`);
  return { success: true, topic: NTFY_TOPIC };
}

/**
 * Check if notifications are configured (NTFY_TOPIC set in .env)
 */
function isConfigured() {
  return !!process.env.NTFY_TOPIC;
}

module.exports = { sendNotification, isConfigured };
