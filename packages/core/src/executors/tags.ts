import type { Tag } from '@ikko-dev/ghost-api';
import { unwrapMany, unwrapOne, wrapForWrite } from '@ikko-dev/ghost-api';

import type { ExecutorContext, ExecutorResult } from '../context.ts';
import { ROUTES, request } from '../routes.ts';
import type { BrowseOptions, ReadOptions } from './types.ts';
import { browseQuery, readQuery } from './types.ts';

interface TagsEnvelope {
  tags: Tag[];
  meta?: { pagination?: unknown };
}

export async function browseTags(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ tags: Tag[]; meta?: unknown }>> {
  const response = await request<TagsEnvelope>(ROUTES.tags.browse, ctx, {}, {
    query: browseQuery(options),
  });
  return { data: { tags: unwrapMany<Tag>(response, 'tags'), meta: response.meta } };
}

export async function readTag(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Tag | undefined>> {
  if (!options.slug && !options.id) {
    throw new Error('readTag requires either id or slug.');
  }
  const route = options.slug ? ROUTES.tags.readBySlug : ROUTES.tags.read;
  const params = options.slug ? { slug: options.slug } : { id: options.id ?? '' };
  const response = await request<TagsEnvelope>(route, ctx, params, {
    query: readQuery(options),
  });
  return { data: unwrapOne<Tag>(response, 'tags') };
}

export interface AddTagOptions extends Partial<Tag> {
  name: string;
}

export async function addTag(
  options: AddTagOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Tag | undefined>> {
  const response = await request<TagsEnvelope>(ROUTES.tags.add, ctx, {}, {
    body: wrapForWrite('tags', options),
  });
  return { data: unwrapOne<Tag>(response, 'tags') };
}

export interface EditTagOptions extends Partial<Tag> {
  id: string;
}

export async function editTag(
  options: EditTagOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Tag | undefined>> {
  const { id, ...body } = options;
  const response = await request<TagsEnvelope>(ROUTES.tags.edit, ctx, { id }, {
    body: wrapForWrite('tags', body),
  });
  return { data: unwrapOne<Tag>(response, 'tags') };
}

export async function deleteTag(
  options: { id: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<void>> {
  await request<void>(ROUTES.tags.delete, ctx, { id: options.id });
  return { data: undefined };
}
