import { describe, expect, it } from 'vitest';

import { buildPath, ROUTES } from './routes.ts';

describe('buildPath', () => {
  it('returns the path verbatim when no placeholders', () => {
    expect(buildPath(ROUTES.posts.browse)).toBe('/posts');
  });

  it('replaces a single placeholder', () => {
    expect(buildPath(ROUTES.posts.read, { id: 'abc123' })).toBe('/posts/abc123');
  });

  it('throws when a required placeholder is missing', () => {
    expect(() => buildPath(ROUTES.posts.read, {})).toThrow(/Missing route params: id/);
  });

  it('URL-encodes path parameters', () => {
    expect(buildPath(ROUTES.posts.readBySlug, { slug: 'hello world' })).toBe(
      '/posts/slug/hello%20world',
    );
  });
});

describe('ROUTES', () => {
  it('marks the Content API for authors', () => {
    expect(ROUTES.authors.browse.api).toBe('content');
  });

  it('marks the Admin API for posts', () => {
    expect(ROUTES.posts.browse.api).toBe('admin');
  });
});
