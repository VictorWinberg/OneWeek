import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';
import { getEnv } from '../utils/env.js';

const SCOPES = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'];

// Buffer time before token expiry to trigger refresh (5 minutes)
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export interface SessionTokens {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
}

export function createOAuth2Client(redirectUri?: string): OAuth2Client {
  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(oauth2Client: OAuth2Client, redirectUri?: string): string {
  const options: { access_type: string; scope: string[]; prompt: string; redirect_uri?: string } = {
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  };
  if (redirectUri) options.redirect_uri = redirectUri;
  return oauth2Client.generateAuthUrl(options);
}

export async function getTokensFromCode(oauth2Client: OAuth2Client, code: string): Promise<Credentials> {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function setCredentials(oauth2Client: OAuth2Client, tokens: Credentials): void {
  oauth2Client.setCredentials(tokens);
}

export async function getUserInfo(oauth2Client: OAuth2Client) {
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

/**
 * Check if tokens are expired or about to expire
 */
export function isTokenExpired(tokens: SessionTokens): boolean {
  if (!tokens.expiry_date) {
    // If no expiry date, assume not expired
    return false;
  }
  // Check if token expires within the buffer time
  return Date.now() >= tokens.expiry_date - TOKEN_EXPIRY_BUFFER_MS;
}

/**
 * Refresh access token using refresh token
 * Returns new tokens if successful, null if refresh failed
 */
export async function refreshAccessToken(tokens: SessionTokens): Promise<SessionTokens | null> {
  if (!tokens.refresh_token) {
    console.warn('No refresh token available');
    return null;
  }

  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token ?? undefined,
      refresh_token: credentials.refresh_token ?? tokens.refresh_token, // Keep old refresh token if new one not provided
      expiry_date: credentials.expiry_date ?? undefined,
    };
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    return null;
  }
}
