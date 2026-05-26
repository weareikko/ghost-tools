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

export type AuthParseFailureReason =
  | "missing_authorization_header"
  | "invalid_authorization_header"
  | "unsupported_authorization_scheme"
  | "empty_bearer_token"
  | "url_decode_failed"
  | "not_base64url"
  | "invalid_base64url_length"
  | "base64url_decode_failed"
  | "empty_decoded_payload"
  | "json_parse_failed"
  | "payload_not_object"
  | "missing_ghost_url"
  | "missing_credentials";

export interface SecretDebugSummary {
  present: boolean;
  length?: number;
  prefix?: string;
  suffix?: string;
}

export interface AuthParseDebugInfo {
  headerPresent: boolean;
  scheme?: string;
  rawBearerLength?: number;
  urlDecodedLength?: number;
  urlDecodeSucceeded?: boolean;
  strippedQuotes?: boolean;
  bearerSummary?: SecretDebugSummary;
  looksBase64Url?: boolean;
  decodedLength?: number;
  decodedJsonKeys?: string[];
  jsonParseSucceeded?: boolean;
  hasGhostUrl?: boolean;
  hasStaffAccessToken?: boolean;
  staffAccessTokenLength?: number;
  hasContentApiKey?: boolean;
  contentApiKeyLength?: number;
  reason?: AuthParseFailureReason;
}

export interface AuthParseDetailedResult {
  credentials: GhostCredentials | null;
  debug: AuthParseDebugInfo;
}

const BASE64URL_WITH_OPTIONAL_PADDING_RE = /^[A-Za-z0-9_-]+={0,2}$/;

export function isAuthDebugEnabled(): boolean {
  const value = process.env.GHOST_MCP_DEBUG_AUTH?.toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export function debugAuth(event: string, details: Record<string, unknown> = {}): void {
  if (!isAuthDebugEnabled()) return;
  console.log(`[auth-debug] ${event} ${JSON.stringify(details)}`);
}

export function summarizeSecret(value: string | undefined | null): SecretDebugSummary {
  if (!value) return { present: false };
  return {
    present: true,
    length: value.length,
    prefix: value.slice(0, 4),
    suffix: value.slice(-4),
  };
}

function fail(debug: AuthParseDebugInfo, reason: AuthParseFailureReason): AuthParseDetailedResult {
  return { credentials: null, debug: { ...debug, reason } };
}

function stripSurroundingQuotes(token: string): { token: string; stripped: boolean } {
  if (token.length >= 2) {
    const first = token[0];
    const last = token[token.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return { token: token.slice(1, -1).trim(), stripped: true };
    }
  }
  return { token, stripped: false };
}

function tryDecodeBase64Url(token: string): {
  decoded: string | null;
  reason?: AuthParseFailureReason;
} {
  if (!BASE64URL_WITH_OPTIONAL_PADDING_RE.test(token)) {
    return { decoded: null, reason: "not_base64url" };
  }

  const unpadded = token.replace(/=+$/, "");
  if (unpadded.length % 4 === 1) {
    return { decoded: null, reason: "invalid_base64url_length" };
  }

  try {
    const decoded = Buffer.from(unpadded, "base64url").toString("utf-8");
    if (!decoded) return { decoded: null, reason: "empty_decoded_payload" };
    return { decoded };
  } catch {
    return { decoded: null, reason: "base64url_decode_failed" };
  }
}

function parseJsonCredentials(decoded: string): {
  credentials: GhostCredentials | null;
  debug: Pick<
    AuthParseDebugInfo,
    | "decodedJsonKeys"
    | "jsonParseSucceeded"
    | "hasGhostUrl"
    | "hasStaffAccessToken"
    | "staffAccessTokenLength"
    | "hasContentApiKey"
    | "contentApiKeyLength"
  >;
  reason?: AuthParseFailureReason;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded) as unknown;
  } catch {
    return {
      credentials: null,
      debug: { jsonParseSucceeded: false },
      reason: "json_parse_failed",
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      credentials: null,
      debug: { jsonParseSucceeded: true },
      reason: "payload_not_object",
    };
  }

  const obj = parsed as Record<string, unknown>;
  const staffAccessToken =
    typeof obj.staffAccessToken === "string" ? obj.staffAccessToken : undefined;
  const contentApiKey = typeof obj.contentApiKey === "string" ? obj.contentApiKey : undefined;
  const debug = {
    decodedJsonKeys: Object.keys(obj).toSorted(),
    jsonParseSucceeded: true,
    hasGhostUrl: typeof obj.ghostUrl === "string",
    hasStaffAccessToken: Boolean(staffAccessToken),
    staffAccessTokenLength: staffAccessToken?.length,
    hasContentApiKey: Boolean(contentApiKey),
    contentApiKeyLength: contentApiKey?.length,
  };

  if (typeof obj.ghostUrl !== "string" || !obj.ghostUrl) {
    return { credentials: null, debug, reason: "missing_ghost_url" };
  }

  if (!staffAccessToken && !contentApiKey) {
    return { credentials: null, debug, reason: "missing_credentials" };
  }

  return {
    credentials: {
      ghostUrl: obj.ghostUrl,
      staffAccessToken,
      contentApiKey,
    },
    debug,
  };
}

/**
 * Parse the `Authorization: Bearer <token>` header into credentials, with
 * structured debug metadata explaining each failure mode.
 */
export function parseAuthHeaderDetailed(
  authHeader: string | undefined | null,
): AuthParseDetailedResult {
  const debug: AuthParseDebugInfo = { headerPresent: Boolean(authHeader) };
  if (!authHeader) return fail(debug, "missing_authorization_header");

  const trimmedHeader = authHeader.trim();
  const match = trimmedHeader.match(/^(\S+)\s+(.+)$/);
  if (!match) return fail(debug, "invalid_authorization_header");

  const [, scheme = "", rawToken = ""] = match;
  debug.scheme = scheme;
  if (scheme.toLowerCase() !== "bearer") {
    return fail(debug, "unsupported_authorization_scheme");
  }

  debug.rawBearerLength = rawToken.length;
  let token = rawToken.trim();
  if (!token) return fail(debug, "empty_bearer_token");

  try {
    token = decodeURIComponent(token);
    debug.urlDecodeSucceeded = true;
  } catch {
    debug.urlDecodeSucceeded = false;
    return fail(debug, "url_decode_failed");
  }

  token = token.trim();
  debug.urlDecodedLength = token.length;

  const quoteResult = stripSurroundingQuotes(token);
  token = quoteResult.token;
  debug.strippedQuotes = quoteResult.stripped;
  debug.bearerSummary = summarizeSecret(token);

  if (!token) return fail(debug, "empty_bearer_token");

  debug.looksBase64Url = BASE64URL_WITH_OPTIONAL_PADDING_RE.test(token);
  const decodedResult = tryDecodeBase64Url(token);
  if (!decodedResult.decoded) {
    return fail(debug, decodedResult.reason ?? "base64url_decode_failed");
  }

  debug.decodedLength = decodedResult.decoded.length;
  const parsed = parseJsonCredentials(decodedResult.decoded);
  Object.assign(debug, parsed.debug);
  if (!parsed.credentials) {
    return fail(debug, parsed.reason ?? "json_parse_failed");
  }

  return { credentials: parsed.credentials, debug };
}

/**
 * Parse the `Authorization: Bearer <token>` header into credentials.
 *
 * Returns null if the header is missing or unparseable.
 */
export function parseAuthHeader(authHeader: string | undefined | null): GhostCredentials | null {
  return parseAuthHeaderDetailed(authHeader).credentials;
}

/**
 * Build a Bearer-ready token from credentials.
 *
 * Useful for documentation, tests, and the OAuth `/token` endpoint.
 */
export function createAuthToken(credentials: GhostCredentials): string {
  if (!credentials.staffAccessToken && !credentials.contentApiKey) {
    throw new Error("createAuthToken requires either staffAccessToken or contentApiKey.");
  }
  return Buffer.from(JSON.stringify(credentials)).toString("base64url");
}
