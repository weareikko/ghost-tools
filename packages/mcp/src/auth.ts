/**
 * Authentication for the Ghost MCP HTTP server.
 *
 * The Bearer token is `base64url(JSON.stringify({ ghostUrl, staffAccessToken, contentApiKey }))`.
 *
 * This stateless format lets the MCP client hold both an Admin API credential and
 * an optional Content API key without server-side storage.
 */

export interface GhostCredentials {
  /** Ghost site URL, e.g. https://my-blog.ghost.io (no trailing slash). */
  ghostUrl: string;
  /** Staff access token in `id:secret` format. Required for Admin API calls. */
  staffAccessToken?: string;
  /** Content API key. Required for Content API calls. */
  contentApiKey?: string;
}

function tryDecodeBase64Url(token: string): string | null {
  // Buffer.from('xxx', 'base64url') never throws — it silently drops invalid chars.
  const decoded = Buffer.from(token, 'base64url').toString('utf-8');
  if (!decoded || decoded === token) return null;

  // Roundtrip check — if it re-encodes back to the input, it was genuine base64url.
  const re = Buffer.from(decoded).toString('base64url');
  if (re === token) return decoded;
  return null;
}

function tryParseJsonCredentials(decoded: string): GhostCredentials | null {
  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'ghostUrl' in parsed &&
      typeof (parsed as Record<string, unknown>).ghostUrl === 'string'
    ) {
      const obj = parsed as Record<string, unknown>;
      const creds: GhostCredentials = { ghostUrl: obj.ghostUrl as string };
      if (typeof obj.staffAccessToken === 'string') creds.staffAccessToken = obj.staffAccessToken;
      if (typeof obj.contentApiKey === 'string') creds.contentApiKey = obj.contentApiKey;
      if (!creds.staffAccessToken && !creds.contentApiKey) return null;
      return creds;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

/**
 * Parse the `Authorization: Bearer <token>` header into credentials.
 *
 * Returns null if the header is missing or unparseable.
 */
export function parseAuthHeader(authHeader: string | undefined | null): GhostCredentials | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  let token: string;
  try {
    token = decodeURIComponent(match[1].trim());
  } catch {
    return null;
  }
  if (!token) return null;

  const decoded = tryDecodeBase64Url(token);
  if (!decoded) return null;

  return tryParseJsonCredentials(decoded);
}

/**
 * Build a Bearer-ready token from credentials.
 *
 * Useful for documentation, tests, and the OAuth `/token` endpoint.
 */
export function createAuthToken(credentials: GhostCredentials): string {
  if (!credentials.staffAccessToken && !credentials.contentApiKey) {
    throw new Error('createAuthToken requires either staffAccessToken or contentApiKey.');
  }
  return Buffer.from(JSON.stringify(credentials)).toString('base64url');
}
