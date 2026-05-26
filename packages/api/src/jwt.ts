/**
 * Minimal HS256 JWT signer for Ghost Admin API tokens.
 *
 * Ghost Admin API auth flow:
 *   1. Take staff access token `{id}:{hexSecret}`
 *   2. Split into id and secret
 *   3. Hex-decode the secret into raw bytes
 *   4. Sign a JWT with HS256 using those bytes as the key
 *      Header:  { alg: "HS256", typ: "JWT", kid: "{id}" }
 *      Payload: { iat, exp (≤ iat + 5 min), aud: "/admin/" }
 *   5. Send as `Authorization: Ghost {jwt}`
 *
 * See https://ghost.org/docs/admin-api/#token-authentication
 */

import { createHmac } from 'node:crypto';

const FIVE_MINUTES_S = 5 * 60;

/**
 * Encode a Buffer as base64url (no padding).
 */
function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export interface AdminJwtOptions {
  /** Token lifetime in seconds. Default 5 min (Ghost rejects longer). Max 300. */
  expiresInSeconds?: number;
  /** Override `iat` claim (seconds since epoch) — for deterministic tests. */
  now?: number;
}

/**
 * Sign a Ghost Admin JWT from a staff access token.
 *
 * @param staffAccessToken — the `id:hexSecret` value from a Ghost custom integration
 * @param options — optional overrides
 * @returns the signed JWT string (no `Ghost ` prefix)
 *
 * @throws Error if the token isn't in `id:hex` format
 */
export function signAdminJwt(staffAccessToken: string, options?: AdminJwtOptions): string {
  const colonIndex = staffAccessToken.indexOf(':');
  if (colonIndex < 1) {
    throw new Error(
      'Invalid Ghost staff access token: expected format "id:hexSecret".',
    );
  }

  const id = staffAccessToken.slice(0, colonIndex);
  const hexSecret = staffAccessToken.slice(colonIndex + 1);

  if (!/^[\da-f]+$/i.test(hexSecret) || hexSecret.length % 2 !== 0) {
    throw new Error(
      'Invalid Ghost staff access token: secret must be an even-length hex string.',
    );
  }

  const secret = Buffer.from(hexSecret, 'hex');
  const requested = options?.expiresInSeconds ?? FIVE_MINUTES_S;
  const lifetime = Math.min(Math.max(requested, 1), FIVE_MINUTES_S);
  const iat = options?.now ?? Math.floor(Date.now() / 1000);
  const exp = iat + lifetime;

  const header = { alg: 'HS256', typ: 'JWT', kid: id };
  const payload = { iat, exp, aud: '/admin/' };

  const headerSeg = base64url(JSON.stringify(header));
  const payloadSeg = base64url(JSON.stringify(payload));
  const signingInput = `${headerSeg}.${payloadSeg}`;

  const signature = createHmac('sha256', secret).update(signingInput).digest();
  const signatureSeg = base64url(signature);

  return `${signingInput}.${signatureSeg}`;
}
