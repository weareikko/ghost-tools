import { describe, expect, it } from 'vitest';

import { createAuthToken, parseAuthHeader } from './auth.ts';

describe('parseAuthHeader', () => {
  it('returns null for missing or non-Bearer headers', () => {
    expect(parseAuthHeader(undefined)).toBeNull();
    expect(parseAuthHeader('Basic xxx')).toBeNull();
  });

  it('parses base64(url:id:secret) format', () => {
    const token = createAuthToken({
      ghostUrl: 'https://x.ghost.io',
      staffAccessToken: 'myid:cafebabe',
    });
    const result = parseAuthHeader(`Bearer ${token}`);
    expect(result).toEqual({
      ghostUrl: 'https://x.ghost.io',
      staffAccessToken: 'myid:cafebabe',
    });
  });

  it('parses base64(url:id:secret:contentKey) format', () => {
    const token = createAuthToken({
      ghostUrl: 'https://x.ghost.io',
      staffAccessToken: 'myid:cafebabe',
      contentApiKey: 'abc123',
    });
    const result = parseAuthHeader(`Bearer ${token}`);
    expect(result).toEqual({
      ghostUrl: 'https://x.ghost.io',
      staffAccessToken: 'myid:cafebabe',
      contentApiKey: 'abc123',
    });
  });

  it('parses base64(JSON) format (content-only)', () => {
    const token = createAuthToken({
      ghostUrl: 'https://x.ghost.io',
      contentApiKey: 'abc123',
    });
    const result = parseAuthHeader(`Bearer ${token}`);
    expect(result).toEqual({
      ghostUrl: 'https://x.ghost.io',
      contentApiKey: 'abc123',
    });
  });

  it('returns null for malformed payloads', () => {
    const bad = Buffer.from('not-a-url-here').toString('base64');
    expect(parseAuthHeader(`Bearer ${bad}`)).toBeNull();
  });
});

describe('createAuthToken', () => {
  it('refuses to create a token without any credential', () => {
    expect(() => createAuthToken({ ghostUrl: 'https://x.ghost.io' })).toThrow(/staffAccessToken or contentApiKey/);
  });
});
