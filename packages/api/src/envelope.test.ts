import { describe, expect, it } from 'vitest';

import { extractMeta, unwrapMany, unwrapOne, wrapForWrite } from './envelope.ts';

describe('envelope', () => {
  it('unwrapOne returns the first item or undefined', () => {
    expect(unwrapOne({ posts: [{ id: '1' }, { id: '2' }] }, 'posts')).toEqual({ id: '1' });
    expect(unwrapOne({ posts: [] }, 'posts')).toBeUndefined();
    expect(unwrapOne({}, 'posts')).toBeUndefined();
  });

  it('unwrapMany returns the array or an empty array', () => {
    expect(unwrapMany({ posts: [{ id: '1' }] }, 'posts')).toEqual([{ id: '1' }]);
    expect(unwrapMany({}, 'posts')).toEqual([]);
  });

  it('extractMeta returns the meta object if present', () => {
    expect(extractMeta({ meta: { pagination: { page: 1, limit: 15, pages: 1, total: 1, next: null, prev: null } } }))
      .toMatchObject({ pagination: { page: 1 } });
    expect(extractMeta({})).toBeUndefined();
  });

  it('wrapForWrite wraps a payload in an array under the given key', () => {
    expect(wrapForWrite('posts', { title: 'x' })).toEqual({ posts: [{ title: 'x' }] });
  });
});
