import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track calls to mock functions
let generateAuthUrlCalls: unknown[] = [];
let getTokenCalls: unknown[] = [];
let setCredentialsCalls: unknown[] = [];

// Mock modules - all inline without external references
vi.mock('../../src/utils/env.js', () => ({
  getEnv: (key: string) => {
    const envMap: Record<string, string> = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
    };
    return envMap[key];
  },
}));

vi.mock('googleapis', () => {
  // Define tracking arrays in the mock scope
  const calls = {
    generateAuthUrl: [] as unknown[],
    getToken: [] as unknown[],
    setCredentials: [] as unknown[],
    userInfoGet: [] as unknown[],
  };

  // Expose for test access
  (globalThis as { __mockCalls?: typeof calls }).__mockCalls = calls;

  return {
    google: {
      auth: {
        OAuth2: class MockOAuth2 {
          generateAuthUrl(options: unknown) {
            calls.generateAuthUrl.push(options);
            return 'https://accounts.google.com/o/oauth2/auth?...';
          }
          async getToken(code: string) {
            calls.getToken.push(code);
            return {
              tokens: {
                access_token: 'test-access-token',
                refresh_token: 'test-refresh-token',
                expiry_date: Date.now() + 3600000,
              },
            };
          }
          setCredentials(tokens: unknown) {
            calls.setCredentials.push(tokens);
          }
        },
      },
      oauth2: () => ({
        userinfo: {
          get: async () => {
            calls.userInfoGet.push({});
            return {
              data: {
                email: 'test@example.com',
                name: 'Test User',
                picture: 'https://example.com/avatar.png',
              },
            };
          },
        },
      }),
    },
  };
});

// Import after mocking
import {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  setCredentials,
  getUserInfo,
} from '../../src/services/googleAuth.js';

// Helper to get mock calls
function getMockCalls() {
  return (globalThis as { __mockCalls?: { generateAuthUrl: unknown[]; getToken: unknown[]; setCredentials: unknown[]; userInfoGet: unknown[] } }).__mockCalls!;
}

describe('googleAuth', () => {
  beforeEach(() => {
    // Clear call tracking
    const calls = getMockCalls();
    calls.generateAuthUrl = [];
    calls.getToken = [];
    calls.setCredentials = [];
    calls.userInfoGet = [];
  });

  describe('createOAuth2Client', () => {
    it('should create an OAuth2 client', () => {
      const client = createOAuth2Client();
      expect(client).toBeDefined();
      expect(client.generateAuthUrl).toBeDefined();
    });

    it('should create an OAuth2 client with redirect URI', () => {
      const redirectUri = 'http://localhost:3000/callback';
      const client = createOAuth2Client(redirectUri);
      expect(client).toBeDefined();
    });
  });

  describe('getAuthUrl', () => {
    it('should generate an auth URL', () => {
      const client = createOAuth2Client();
      const url = getAuthUrl(client);

      expect(getMockCalls().generateAuthUrl.length).toBe(1);
      expect(url).toContain('https://accounts.google.com');
    });

    it('should include correct options', () => {
      const client = createOAuth2Client();
      getAuthUrl(client);

      const options = getMockCalls().generateAuthUrl[0] as {
        access_type: string;
        prompt: string;
        scope: string[];
      };
      expect(options.access_type).toBe('offline');
      expect(options.prompt).toBe('consent');
      expect(options.scope).toContain('https://www.googleapis.com/auth/userinfo.email');
      expect(options.scope).toContain('https://www.googleapis.com/auth/userinfo.profile');
    });

    it('should include redirect URI when provided', () => {
      const client = createOAuth2Client();
      const redirectUri = 'http://localhost:3000/callback';
      getAuthUrl(client, redirectUri);

      const options = getMockCalls().generateAuthUrl[0] as { redirect_uri?: string };
      expect(options.redirect_uri).toBe(redirectUri);
    });
  });

  describe('getTokensFromCode', () => {
    it('should exchange code for tokens', async () => {
      const client = createOAuth2Client();
      const tokens = await getTokensFromCode(client, 'auth-code-123');

      expect(getMockCalls().getToken[0]).toBe('auth-code-123');
      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('refresh_token');
    });
  });

  describe('setCredentials', () => {
    it('should set credentials on the client', () => {
      const client = createOAuth2Client();
      const tokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      };

      setCredentials(client, tokens);

      expect(getMockCalls().setCredentials[0]).toEqual(tokens);
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info from Google', async () => {
      const client = createOAuth2Client();
      const userInfo = await getUserInfo(client);

      expect(userInfo).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.png',
      });
    });
  });
});
