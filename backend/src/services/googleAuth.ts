import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';
import { getEnv } from '../utils/env.js';

const SCOPES = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'];

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
