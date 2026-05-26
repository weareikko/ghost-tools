import type { GhostHttpClient } from '@ikko-dev/ghost-api';

import { describe, expect, it, vi } from 'vitest';

import type { ExecutorContext } from '../context.ts';
import { addPost, browsePosts, readPost } from './posts.ts';

function makeCtx(adminImpl: ReturnType<typeof vi.fn>): ExecutorContext {
  return {
    client: { admin_: adminImpl } as unknown as GhostHttpClient,
    api: 'admin',
  };
}

describe('posts executors', () => {
  it('browsePosts unwraps the posts array and passes browse query params', async () => {
    const admin = vi.fn().mockResolvedValue({ posts: [{ id: '1', title: 'hi' }], meta: {} });
    const ctx = makeCtx(admin);

    const result = await browsePosts({ filter: 'status:published', limit: 5 }, ctx);

    expect(admin).toHaveBeenCalledWith(
      'GET',
      '/posts',
      undefined,
      expect.objectContaining({ filter: 'status:published', limit: '5' }),
    );
    expect(result.data.posts).toEqual([{ id: '1', title: 'hi' }]);
  });

  it('readPost by id calls the id route', async () => {
    const admin = vi.fn().mockResolvedValue({ posts: [{ id: 'abc' }] });
    const ctx = makeCtx(admin);

    const result = await readPost({ id: 'abc' }, ctx);
    expect(admin.mock.calls[0][1]).toBe('/posts/abc');
    expect(result.data).toEqual({ id: 'abc' });
  });

  it('readPost by slug calls the slug route', async () => {
    const admin = vi.fn().mockResolvedValue({ posts: [{ id: 'abc', slug: 'hello' }] });
    const ctx = makeCtx(admin);

    await readPost({ slug: 'hello' }, ctx);
    expect(admin.mock.calls[0][1]).toBe('/posts/slug/hello');
  });

  it('readPost requires id or slug', async () => {
    const ctx = makeCtx(vi.fn());
    await expect(readPost({}, ctx)).rejects.toThrow(/id or slug/);
  });

  it('addPost wraps the body in the posts envelope', async () => {
    const admin = vi.fn().mockResolvedValue({ posts: [{ id: 'new', title: 'X' }] });
    const ctx = makeCtx(admin);

    await addPost({ title: 'X' }, ctx);
    expect(admin).toHaveBeenCalledWith('POST', '/posts', { posts: [{ title: 'X' }] }, undefined);
  });
});
