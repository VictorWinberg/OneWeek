import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';
import { getRedirectUri, buildUrl, appendErrorToUrl } from '../../src/utils/url.js';

describe('url utils', () => {
  describe('getRedirectUri', () => {
    it('should build redirect URI from standard request headers', () => {
      const mockReq = {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost:3000';
          return undefined;
        }),
        protocol: 'http',
      } as unknown as Request;

      const uri = getRedirectUri(mockReq);

      expect(uri).toBe('http://localhost:3000/api/auth/callback');
    });

    it('should use X-Forwarded-Proto header when present', () => {
      const mockReq = {
        get: vi.fn((header: string) => {
          if (header === 'X-Forwarded-Proto') return 'https';
          if (header === 'host') return 'example.com';
          return undefined;
        }),
        protocol: 'http',
      } as unknown as Request;

      const uri = getRedirectUri(mockReq);

      expect(uri).toBe('https://example.com/api/auth/callback');
    });

    it('should use X-Forwarded-Host header when present', () => {
      const mockReq = {
        get: vi.fn((header: string) => {
          if (header === 'X-Forwarded-Host') return 'proxy.example.com';
          if (header === 'X-Forwarded-Proto') return 'https';
          return undefined;
        }),
        protocol: 'http',
      } as unknown as Request;

      const uri = getRedirectUri(mockReq);

      expect(uri).toBe('https://proxy.example.com/api/auth/callback');
    });

    it('should default to http when protocol is not set', () => {
      const mockReq = {
        get: vi.fn((header: string) => {
          if (header === 'host') return 'localhost';
          return undefined;
        }),
        protocol: undefined,
      } as unknown as Request;

      const uri = getRedirectUri(mockReq);

      expect(uri).toBe('http://localhost/api/auth/callback');
    });
  });

  describe('buildUrl', () => {
    it('should return base URL when no params provided', () => {
      const url = buildUrl('https://example.com/page');

      expect(url).toBe('https://example.com/page');
    });

    it('should return base URL when params is empty object', () => {
      const url = buildUrl('https://example.com/page', {});

      expect(url).toBe('https://example.com/page');
    });

    it('should append query params to URL without existing query', () => {
      const url = buildUrl('https://example.com/page', {
        foo: 'bar',
        baz: 'qux',
      });

      expect(url).toBe('https://example.com/page?foo=bar&baz=qux');
    });

    it('should append query params to URL with existing query', () => {
      const url = buildUrl('https://example.com/page?existing=param', {
        foo: 'bar',
      });

      expect(url).toBe('https://example.com/page?existing=param&foo=bar');
    });

    it('should encode special characters in params', () => {
      const url = buildUrl('https://example.com', {
        message: 'hello world',
        special: '=&?',
      });

      expect(url).toBe('https://example.com?message=hello%20world&special=%3D%26%3F');
    });
  });

  describe('appendErrorToUrl', () => {
    it('should append error param to URL without query string', () => {
      const url = appendErrorToUrl('https://example.com', 'unauthorized');

      expect(url).toBe('https://example.com?error=unauthorized');
    });

    it('should append error param to URL with existing query string', () => {
      const url = appendErrorToUrl('https://example.com?page=1', 'session_expired');

      expect(url).toBe('https://example.com?page=1&error=session_expired');
    });

    it('should encode error message', () => {
      const url = appendErrorToUrl('https://example.com', 'invalid access');

      expect(url).toBe('https://example.com?error=invalid%20access');
    });
  });
});

