import type { Request } from 'express';

/**
 * Build the OAuth redirect URI from the request headers
 * Handles X-Forwarded-* headers for reverse proxy scenarios
 */
export function getRedirectUri(req: Request): string {
  const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'http';
  const host = req.get('X-Forwarded-Host') || req.get('host');
  return `${protocol}://${host}/api/auth/callback`;
}

/**
 * Build a full URL with optional query parameters
 */
export function buildUrl(baseUrl: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return `${baseUrl}${separator}${queryString}`;
}

/**
 * Append error parameter to redirect URL
 */
export function appendErrorToUrl(url: string, error: string): string {
  return buildUrl(url, { error });
}

