import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, getUserEmail, getTokens } from '../../src/middleware/auth.js';

describe('auth middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };
    mockNext = vi.fn();
    mockReq = {};
  });

  describe('requireAuth', () => {
    it('should call next when access_token and userEmail exist', () => {
      mockReq.session = {
        tokens: { access_token: 'valid-token' },
        userEmail: 'user@example.com',
      } as Request['session'];

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should return 401 when session is missing', () => {
      mockReq.session = undefined;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when tokens are missing', () => {
      mockReq.session = {} as Request['session'];

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 401 when access_token is missing', () => {
      mockReq.session = {
        userEmail: 'user@example.com',
        tokens: {},
      } as Request['session'];

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 401 when userEmail is missing', () => {
      mockReq.session = {
        tokens: { access_token: 'valid-token' },
      } as Request['session'];

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });
  });

  describe('getUserEmail', () => {
    it('should return user email from session', () => {
      mockReq.session = {
        userEmail: 'user@example.com',
      } as Request['session'];

      const email = getUserEmail(mockReq as Request);

      expect(email).toBe('user@example.com');
    });

    it('should return empty string when session is undefined', () => {
      mockReq.session = undefined;

      const email = getUserEmail(mockReq as Request);

      expect(email).toBe('');
    });

    it('should return empty string when userEmail is undefined', () => {
      mockReq.session = {} as Request['session'];

      const email = getUserEmail(mockReq as Request);

      expect(email).toBe('');
    });
  });

  describe('getTokens', () => {
    it('should return tokens from session', () => {
      const tokens = { access_token: 'token123', refresh_token: 'refresh456' };
      mockReq.session = { tokens } as Request['session'];

      const result = getTokens(mockReq as Request);

      expect(result).toEqual(tokens);
    });

    it('should return undefined when session is undefined', () => {
      mockReq.session = undefined;

      const result = getTokens(mockReq as Request);

      expect(result).toBeUndefined();
    });

    it('should return undefined when tokens are not set', () => {
      mockReq.session = {} as Request['session'];

      const result = getTokens(mockReq as Request);

      expect(result).toBeUndefined();
    });
  });
});

