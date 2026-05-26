import type { Post } from "@ikko-dev/ghost-api";
import { unwrapMany, unwrapOne, wrapForWrite } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";
import { CONTENT_ROUTES, ROUTES, request } from "../routes.ts";
import type { BrowseOptions, ReadOptions } from "./types.ts";
import { browseQuery, readQuery } from "./types.ts";

interface PostsEnvelope {
  posts: Post[];
  meta?: { pagination?: unknown };
}

export async function browsePosts(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ posts: Post[]; meta?: unknown }>> {
  const response = await request<PostsEnvelope>(
    ROUTES.posts.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { posts: unwrapMany<Post>(response, "posts"), meta: response.meta } };
}

export async function readPost(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Post | undefined>> {
  const route = options.slug ? ROUTES.posts.readBySlug : ROUTES.posts.read;
  const params = options.slug ? { slug: options.slug } : { id: options.id ?? "" };
  if (!options.slug && !options.id) {
    throw new Error("readPost requires either id or slug.");
  }
  const response = await request<PostsEnvelope>(route, ctx, params, {
    query: readQuery(options),
  });
  return { data: unwrapOne<Post>(response, "posts") };
}

export interface AddPostOptions extends Partial<Post> {
  title: string;
}

export async function addPost(
  options: AddPostOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Post | undefined>> {
  const response = await request<PostsEnvelope>(
    ROUTES.posts.add,
    ctx,
    {},
    {
      body: wrapForWrite("posts", options),
    },
  );
  return { data: unwrapOne<Post>(response, "posts") };
}

export interface EditPostOptions extends Partial<Post> {
  id: string;
  /** Optimistic concurrency token — required by Ghost. */
  updated_at: string;
}

export async function editPost(
  options: EditPostOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Post | undefined>> {
  const { id, ...body } = options;
  const response = await request<PostsEnvelope>(
    ROUTES.posts.edit,
    ctx,
    { id },
    {
      body: wrapForWrite("posts", body),
    },
  );
  return { data: unwrapOne<Post>(response, "posts") };
}

export async function deletePost(
  options: { id: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<void>> {
  await request<void>(ROUTES.posts.delete, ctx, { id: options.id });
  return { data: undefined };
}

export async function copyPost(
  options: { id: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<Post | undefined>> {
  const response = await request<PostsEnvelope>(ROUTES.posts.copy, ctx, { id: options.id });
  return { data: unwrapOne<Post>(response, "posts") };
}

// ── Content API variants (public, read-only) ─────────────────────────────────

export async function browsePostsContent(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ posts: Post[]; meta?: unknown }>> {
  const response = await request<PostsEnvelope>(
    CONTENT_ROUTES.posts.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { posts: unwrapMany<Post>(response, "posts"), meta: response.meta } };
}

export async function readPostContent(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Post | undefined>> {
  if (!options.slug && !options.id) {
    throw new Error("readPostContent requires either id or slug.");
  }
  const route = options.slug ? CONTENT_ROUTES.posts.readBySlug : CONTENT_ROUTES.posts.read;
  const params = options.slug ? { slug: options.slug } : { id: options.id ?? "" };
  const response = await request<PostsEnvelope>(route, ctx, params, {
    query: readQuery(options),
  });
  return { data: unwrapOne<Post>(response, "posts") };
}
