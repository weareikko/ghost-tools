import type { Author } from '@ikko-dev/ghost-api';
import { unwrapMany, unwrapOne } from '@ikko-dev/ghost-api';

import type { ExecutorContext, ExecutorResult } from '../context.ts';
import { ROUTES, request } from '../routes.ts';
import type { BrowseOptions, ReadOptions } from './types.ts';
import { browseQuery, readQuery } from './types.ts';

interface AuthorsEnvelope {
  authors: Author[];
  meta?: { pagination?: unknown };
}

/**
 * Authors live on the Content API only — the Admin API exposes them as `users`.
 */
export async function browseAuthors(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ authors: Author[]; meta?: unknown }>> {
  const response = await request<AuthorsEnvelope>(ROUTES.authors.browse, ctx, {}, {
    query: browseQuery(options),
  });
  return { data: { authors: unwrapMany<Author>(response, 'authors'), meta: response.meta } };
}

export async function readAuthor(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Author | undefined>> {
  if (!options.slug && !options.id) {
    throw new Error('readAuthor requires id or slug.');
  }
  const route = options.slug ? ROUTES.authors.readBySlug : ROUTES.authors.read;
  const params = options.slug ? { slug: options.slug } : { id: options.id ?? '' };
  const response = await request<AuthorsEnvelope>(route, ctx, params, {
    query: readQuery(options),
  });
  return { data: unwrapOne<Author>(response, 'authors') };
}
