const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const VAPID_PATH = path.join(__dirname, 'data', 'vapid-keys.json');

function initVapid() {
  let keys;
  if (fs.existsSync(VAPID_PATH)) {
    keys = JSON.parse(fs.readFileSync(VAPID_PATH, 'utf-8'));
  } else {
    keys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_PATH, JSON.stringify(keys, null, 2));
  }
  webpush.setVapidDetails(
    'https://nova.srv1042999.hstgr.cloud',
    keys.publicKey,
    keys.privateKey
  );
  return keys;
}

async function sendToAll(title, body, url = '/') {
  const subs = db.getPushSubscriptions();
  console.log(`[Push] Sending to ${subs.length} subscription(s): "${body}"`);
  const payload = JSON.stringify({ title, body, url });

  const results = [];
  for (const sub of subs) {
    try {
      const result = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      console.log(`[Push] SUCCESS (${result.statusCode}) → ${sub.endpoint.substring(0, 60)}`);
      results.push({ success: true, statusCode: result.statusCode });
    } catch (err) {
      console.error(`[Push] FAILED (${err.statusCode || err.code}) → ${sub.endpoint.substring(0, 60)}: ${err.body || err.message}`);
      process.stderr.write(`[Push] Full error: ${JSON.stringify({statusCode: err.statusCode, body: err.body, headers: err.headers})}\n`);
      // Only delete if endpoint is permanently gone (410 Gone)
      if (err.statusCode === 410) {
        db.deletePushSubscription(sub.endpoint);
        console.log(`[Push] Removed expired subscription`);
      }
      results.push({ success: false, error: err.message, statusCode: err.statusCode, body: err.body });
    }
  }
  return results;
}

function getPublicKey() {
  if (!fs.existsSync(VAPID_PATH)) return null;
  const keys = JSON.parse(fs.readFileSync(VAPID_PATH, 'utf-8'));
  return keys.publicKey;
}

module.exports = { initVapid, sendToAll, getPublicKey };
