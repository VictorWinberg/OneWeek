import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  asyncHandler,
  errorHandler,
} from '../../src/middleware/errorHandler.js';

describe('errorHandler middleware', () => {
  describe('Custom Error Classes', () => {
    describe('AppError', () => {
      it('should create error with message and default status 500', () => {
        const error = new AppError('Something went wrong');

        expect(error.message).toBe('Something went wrong');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      });

      it('should create error with custom status code', () => {
        const error = new AppError('Bad gateway', 502);

        expect(error.message).toBe('Bad gateway');
        expect(error.statusCode).toBe(502);
      });
    });

    describe('ValidationError', () => {
      it('should create error with status 400', () => {
        const error = new ValidationError('Invalid input');

        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    describe('AuthenticationError', () => {
      it('should create error with status 401 and default message', () => {
        const error = new AuthenticationError();

        expect(error.message).toBe('Not authenticated');
        expect(error.statusCode).toBe(401);
      });

      it('should create error with custom message', () => {
        const error = new AuthenticationError('Token expired');

        expect(error.message).toBe('Token expired');
        expect(error.statusCode).toBe(401);
      });
    });

    describe('PermissionError', () => {
      it('should create error with status 403', () => {
        const error = new PermissionError('Access denied');

        expect(error.message).toBe('Access denied');
        expect(error.statusCode).toBe(403);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    describe('NotFoundError', () => {
      it('should create error with status 404', () => {
        const error = new NotFoundError('Resource not found');

        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error).toBeInstanceOf(AppError);
      });
    });
  });

  describe('asyncHandler', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };
      mockNext = vi.fn();
    });

    it('should pass through when async function succeeds', async () => {
      const handler = asyncHandler(async (_req, res) => {
        res.json({ success: true });
      });

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when async function throws', async () => {
      const error = new Error('Async error');
      const handler = asyncHandler(async () => {
        throw error;
      });

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should catch rejected promises', async () => {
      const error = new ValidationError('Invalid data');
      const handler = asyncHandler(async () => {
        throw error;
      });

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('errorHandler', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonSpy: ReturnType<typeof vi.fn>;
    let statusSpy: ReturnType<typeof vi.fn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      jsonSpy = vi.fn();
      statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
      mockReq = {};
      mockRes = {
        status: statusSpy,
        json: jsonSpy,
      };
      mockNext = vi.fn();
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should handle AppError with correct status and message', () => {
      const error = new ValidationError('Bad input');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Bad input' });
    });

    it('should handle PermissionError with 403', () => {
      const error = new PermissionError('No access');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'No access' });
    });

    it('should handle NotFoundError with 404', () => {
      const error = new NotFoundError('Item not found');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Item not found' });
    });

    it('should handle generic Error with 500 and generic message', () => {
      const error = new Error('Something broke');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log error message', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Test error');
    });
  });
});

