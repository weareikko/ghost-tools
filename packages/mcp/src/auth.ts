/**
 * Authentication for the Ghost MCP HTTP server.
 *
 * The Bearer token is `base64({ghostUrl}:{staffAccessToken}[:{contentApiKey}])`
 * — a simple stateless format that lets us hold both an Admin API credential
 * and an optional Content API key.
 *
 * Two encoded forms are supported, mirroring forge-tools / productive-tools:
 *
 *  1. **Plain base64(`url:token[:contentKey]`)** — the form built by `createAuthToken`.
 *  2. **Base64-encoded JSON** — `base64(JSON.stringify({ ghostUrl, staffAccessToken, contentApiKey }))`,
 *     used when extra fields need to be carried.
 */

export interface GhostCredentials {
  /** Ghost site URL, e.g. https://my-blog.ghost.io (no trailing slash). */
  ghostUrl: string;
  /** Staff access token in `id:secret` format. Required for Admin API calls. */
  staffAccessToken?: string;
  /** Content API key. Required for Content API calls. */
  contentApiKey?: string;
}

function tryDecodeBase64(token: string): string | null {
  // Buffer.from('xxx', 'base64') never throws — it silently drops invalid chars.
  const decoded = Buffer.from(token, 'base64').toString('utf-8');
  if (!decoded || decoded === token) return null;
  // Roundtrip check — if it re-encodes back to the input, it was genuine base64
  const re = Buffer.from(decoded).toString('base64');
  // Strip padding for the comparison so both `abc=` and `abc` match
  const stripPad = (s: string) => s.replace(/=+$/, '');
  if (stripPad(re) === stripPad(token)) return decoded;
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

function tryParseColonCredentials(decoded: string): GhostCredentials | null {
  // Format: ghostUrl:staffAccessToken[:contentApiKey]
  // Watch out: ghostUrl contains `https://` which itself contains `:` after http(s).
  // So we look for the URL prefix and split the rest carefully.
  const match = decoded.match(/^(https?:\/\/[^\s:]+):(.+)$/);
  if (!match) return null;

  const ghostUrl = match[1];
  const remainder = match[2];

  // The staff access token has format `id:hexSecret` so it contains exactly one `:`.
  // If there are 4+ colons after the URL prefix, the last segment is the content key.
  // We treat the last colon-separated chunk as the content key only when there are 3 segments.
  const segments = remainder.split(':');
  if (segments.length === 2) {
    return { ghostUrl, staffAccessToken: remainder };
  }
  if (segments.length === 3) {
    // id:secret:contentKey
    return {
      ghostUrl,
      staffAccessToken: `${segments[0]}:${segments[1]}`,
      contentApiKey: segments[2],
    };
  }
  // 1 segment → no token. Reject.
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
  const token = match[1].trim();
  if (!token) return null;

  const decoded = tryDecodeBase64(token);
  if (!decoded) return null;

  // Prefer JSON if it looks like an object, otherwise try the colon format
  if (decoded.startsWith('{')) {
    const jsonCreds = tryParseJsonCredentials(decoded);
    if (jsonCreds) return jsonCreds;
  }
  return tryParseColonCredentials(decoded);
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
  if (credentials.contentApiKey && !credentials.staffAccessToken) {
    // No staff token — fall back to JSON form so the content key is preserved.
    return Buffer.from(JSON.stringify(credentials)).toString('base64');
  }
  // Simple colon form, optionally extended with content key.
  const parts = [credentials.ghostUrl, credentials.staffAccessToken];
  if (credentials.contentApiKey) parts.push(credentials.contentApiKey);
  return Buffer.from(parts.join(':')).toString('base64');
}
