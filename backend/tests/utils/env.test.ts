import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

describe('env', () => {
  beforeEach(() => {
    // Reset modules to get fresh imports
    vi.resetModules();
    // Clear any test env vars
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getEnv', () => {
    it('should return value when environment variable exists', async () => {
      process.env.TEST_VAR = 'test-value';

      // Dynamic import to get fresh module
      const { getEnv } = await import('../../src/utils/env.js');

      expect(getEnv('TEST_VAR')).toBe('test-value');
    });

    it('should return default value when env var not set', async () => {
      delete process.env.MISSING_VAR;

      const { getEnv } = await import('../../src/utils/env.js');

      expect(getEnv('MISSING_VAR', 'default-value')).toBe('default-value');
    });

    it('should throw error when required var missing and no default', async () => {
      delete process.env.REQUIRED_VAR;

      const { getEnv } = await import('../../src/utils/env.js');

      expect(() => getEnv('REQUIRED_VAR')).toThrow('Required environment variable REQUIRED_VAR is not set');
    });

    it('should prefer env value over default', async () => {
      process.env.PREF_VAR = 'env-value';

      const { getEnv } = await import('../../src/utils/env.js');

      expect(getEnv('PREF_VAR', 'default-value')).toBe('env-value');
    });

    it('should handle empty string env values', async () => {
      process.env.EMPTY_VAR = '';

      const { getEnv } = await import('../../src/utils/env.js');

      // Empty string is falsy, so default should be used
      expect(getEnv('EMPTY_VAR', 'default')).toBe('default');
    });

    it('should handle numeric string values', async () => {
      process.env.PORT = '3000';

      const { getEnv } = await import('../../src/utils/env.js');

      expect(getEnv('PORT')).toBe('3000');
    });

    it('should handle boolean-like string values', async () => {
      process.env.BOOL_TRUE = 'true';
      process.env.BOOL_FALSE = 'false';

      const { getEnv } = await import('../../src/utils/env.js');

      expect(getEnv('BOOL_TRUE')).toBe('true');
      expect(getEnv('BOOL_FALSE')).toBe('false');
    });

    it('should include variable name in error message', async () => {
      delete process.env.SPECIFIC_VAR;

      const { getEnv } = await import('../../src/utils/env.js');

      expect(() => getEnv('SPECIFIC_VAR')).toThrow('SPECIFIC_VAR');
    });
  });
});

