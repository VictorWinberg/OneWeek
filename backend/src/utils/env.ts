import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env from root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../..', '.env');
const result = dotenv.config({ path: envPath, quiet: true });

if (result.error) {
  console.warn(`Warning: Could not load .env file from ${envPath}`);
  console.warn('Make sure required environment variables are set as environment variables');
}

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not set. Please set it in your .env file or environment.`);
  }

  return value;
}
