/**
 * Google OAuth2 authentication for Gmail and Calendar.
 * Uses Express routes on the main server for the OAuth flow.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'data', 'google-token.json');
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];
const REDIRECT_URI = 'http://localhost:8000/oauth2callback';

/**
 * Read redirect URI from credentials file (Desktop apps use a special URI)
 */
function getRedirectUri() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const config = creds.installed || creds.web;
  // Desktop apps: use loopback with our port
  if (creds.installed) {
    return REDIRECT_URI;
  }
  return config.redirect_uris?.[0] || REDIRECT_URI;
}

let _authClient = null;

/**
 * Create OAuth2 client from credentials file
 */
function createOAuth2Client() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('google-credentials.json not found in backend/');
  }
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_id, client_secret } = creds.installed || creds.web || {};
  if (!client_id) throw new Error('Invalid google-credentials.json format');

  return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
}

/**
 * Load saved token if it exists
 */
function loadToken(oauth2Client) {
  if (!fs.existsSync(TOKEN_PATH)) return false;
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  oauth2Client.setCredentials(token);

  oauth2Client.on('tokens', (tokens) => {
    const existing = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    const updated = { ...existing, ...tokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
    console.log('[Google] Token refreshed and saved');
  });

  return true;
}

/**
 * Get the Google auth URL to redirect the user to
 */
function getAuthUrl() {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

/**
 * Exchange the auth code from Google's callback for tokens
 */
async function handleCallback(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Save token
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('[Google] Token saved');

  _authClient = oauth2Client;
  return oauth2Client;
}

/**
 * Get authenticated OAuth2 client (uses saved token)
 */
async function getAuthClient() {
  if (_authClient) return _authClient;

  const oauth2Client = createOAuth2Client();

  if (loadToken(oauth2Client)) {
    _authClient = oauth2Client;
    return oauth2Client;
  }

  throw new Error('Not authenticated. Visit /api/google/auth to sign in.');
}

/**
 * Check if we have valid credentials
 */
function isAuthenticated() {
  if (!fs.existsSync(CREDENTIALS_PATH)) return false;
  if (!fs.existsSync(TOKEN_PATH)) return false;
  return true;
}

module.exports = { getAuthClient, isAuthenticated, getAuthUrl, handleCallback };
