import { describe, expect, it } from 'vitest';

import { createAuthCode, decodeAuthCode, decrypt, encrypt } from './crypto.ts';

const SECRET = 'test-secret-do-not-use-in-prod';

describe('encrypt/decrypt', () => {
  it('roundtrips plaintext', () => {
    const cipher = encrypt('hello world', SECRET);
    expect(decrypt(cipher, SECRET)).toBe('hello world');
  });

  it('fails with the wrong secret', () => {
    const cipher = encrypt('hello world', SECRET);
    expect(() => decrypt(cipher, 'other-secret')).toThrow(/Decryption failed/);
  });
});

describe('auth code', () => {
  it('roundtrips a payload', () => {
    process.env.OAUTH_SECRET = SECRET;
    const code = createAuthCode({
      ghostUrl: 'https://x.ghost.io',
      staffAccessToken: 'id:cafe',
      codeChallenge: 'abc',
      codeChallengeMethod: 'S256',
    });
    const decoded = decodeAuthCode(code);
    expect(decoded).toMatchObject({
      ghostUrl: 'https://x.ghost.io',
      staffAccessToken: 'id:cafe',
      codeChallenge: 'abc',
    });
  });

  it('rejects expired codes', () => {
    process.env.OAUTH_SECRET = SECRET;
    const code = createAuthCode(
      { ghostUrl: 'https://x.ghost.io', staffAccessToken: 'id:cafe' },
      -1,
    );
    expect(() => decodeAuthCode(code)).toThrow(/expired/);
  });
});
