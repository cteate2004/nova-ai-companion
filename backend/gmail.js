/**
 * Gmail service — reads inbox and identifies meaningful emails.
 */

const { google } = require('googleapis');
const { getAuthClient } = require('./google-auth');

/**
 * Get recent emails from inbox (excludes promotions, social, spam)
 * @param {number} maxResults - Number of emails to fetch
 * @returns {Array} Simplified email objects
 */
async function getRecentEmails(maxResults = 15) {
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  // Search for primary inbox emails, skip spam/promotions/social
  const res = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'category:primary -label:spam -label:trash is:unread',
  });

  if (!res.data.messages || res.data.messages.length === 0) {
    return [];
  }

  const emails = [];
  for (const msg of res.data.messages) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });

    const headers = detail.data.payload.headers;
    const getHeader = (name) => {
      const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return h ? h.value : '';
    };

    emails.push({
      id: msg.id,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: detail.data.snippet,
    });
  }

  return emails;
}

/**
 * Get unread email count
 */
async function getUnreadCount() {
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.labels.get({
    userId: 'me',
    id: 'INBOX',
  });

  return {
    total: res.data.messagesTotal,
    unread: res.data.messagesUnread,
  };
}

/**
 * Get a specific email's full body text
 */
async function getEmailBody(messageId) {
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const detail = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  // Extract text body
  function extractText(parts) {
    if (!parts) return '';
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const result = extractText(part.parts);
        if (result) return result;
      }
    }
    return '';
  }

  const payload = detail.data.payload;
  let body = '';
  if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload.parts) {
    body = extractText(payload.parts);
  }

  // Truncate to keep context manageable
  return body.slice(0, 2000);
}

module.exports = { getRecentEmails, getUnreadCount, getEmailBody };
