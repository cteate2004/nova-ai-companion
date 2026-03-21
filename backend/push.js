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
    'mailto:nova@localhost',
    keys.publicKey,
    keys.privateKey
  );
  return keys;
}

async function sendToAll(title, body, url = '/') {
  const subs = db.getPushSubscriptions();
  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(() => {
        db.deletePushSubscription(sub.endpoint);
      })
    )
  );
  return results;
}

function getPublicKey() {
  if (!fs.existsSync(VAPID_PATH)) return null;
  const keys = JSON.parse(fs.readFileSync(VAPID_PATH, 'utf-8'));
  return keys.publicKey;
}

module.exports = { initVapid, sendToAll, getPublicKey };
