import { google } from "googleapis";
import type { OAuth2Client, Credentials } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export function createOAuth2Client(redirectUri?: string): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(oauth2Client: OAuth2Client): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function getTokensFromCode(
  oauth2Client: OAuth2Client,
  code: string
): Promise<Credentials> {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function setCredentials(
  oauth2Client: OAuth2Client,
  tokens: Credentials
): void {
  oauth2Client.setCredentials(tokens);
}

export async function getUserInfo(oauth2Client: OAuth2Client) {
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

export async function refreshAccessToken(
  oauth2Client: OAuth2Client
): Promise<Credentials | null> {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
}
