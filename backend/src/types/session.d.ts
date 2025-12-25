import 'cookie-session';

declare module 'cookie-session' {
  interface CookieSessionObject {
    tokens?: {
      access_token?: string;
      refresh_token?: string;
      expiry_date?: number;
    };
    userEmail?: string;
    redirectUrl?: string;
  }
}
