import type { Page } from "@ikko-dev/ghost-api";
import { unwrapMany, unwrapOne, wrapForWrite } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";
import { CONTENT_ROUTES, ROUTES, request } from "../routes.ts";
import type { BrowseOptions, ReadOptions } from "./types.ts";
import { browseQuery, readQuery } from "./types.ts";

interface PagesEnvelope {
  pages: Page[];
  meta?: { pagination?: unknown };
}

export async function browsePages(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ pages: Page[]; meta?: unknown }>> {
  const response = await request<PagesEnvelope>(
    ROUTES.pages.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { pages: unwrapMany<Page>(response, "pages"), meta: response.meta } };
}

export async function readPage(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Page | undefined>> {
  if (!options.slug && !options.id) {
    throw new Error("readPage requires either id or slug.");
  }
  const route = options.slug ? ROUTES.pages.readBySlug : ROUTES.pages.read;
  const params = options.slug ? { slug: options.slug } : { id: options.id ?? "" };
  const response = await request<PagesEnvelope>(route, ctx, params, {
    query: readQuery(options),
  });
  return { data: unwrapOne<Page>(response, "pages") };
}

export interface AddPageOptions extends Partial<Page> {
  title: string;
}

export async function addPage(
  options: AddPageOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Page | undefined>> {
  const response = await request<PagesEnvelope>(
    ROUTES.pages.add,
    ctx,
    {},
    {
      body: wrapForWrite("pages", options),
    },
  );
  return { data: unwrapOne<Page>(response, "pages") };
}

export interface EditPageOptions extends Partial<Page> {
  id: string;
  updated_at: string;
}

export async function editPage(
  options: EditPageOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Page | undefined>> {
  const { id, ...body } = options;
  const response = await request<PagesEnvelope>(
    ROUTES.pages.edit,
    ctx,
    { id },
    {
      body: wrapForWrite("pages", body),
    },
  );
  return { data: unwrapOne<Page>(response, "pages") };
}

export async function deletePage(
  options: { id: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<void>> {
  await request<void>(ROUTES.pages.delete, ctx, { id: options.id });
  return { data: undefined };
}

export async function copyPage(
  options: { id: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<Page | undefined>> {
  const response = await request<PagesEnvelope>(ROUTES.pages.copy, ctx, { id: options.id });
  return { data: unwrapOne<Page>(response, "pages") };
}

// ── Content API variants (public, read-only) ─────────────────────────────────

export async function browsePagesContent(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ pages: Page[]; meta?: unknown }>> {
  const response = await request<PagesEnvelope>(
    CONTENT_ROUTES.pages.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { pages: unwrapMany<Page>(response, "pages"), meta: response.meta } };
}

export async function readPageContent(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Page | undefined>> {
  if (!options.slug && !options.id) {
    throw new Error("readPageContent requires either id or slug.");
  }
  const route = options.slug ? CONTENT_ROUTES.pages.readBySlug : CONTENT_ROUTES.pages.read;
  const params = options.slug ? { slug: options.slug } : { id: options.id ?? "" };
  const response = await request<PagesEnvelope>(route, ctx, params, {
    query: readQuery(options),
  });
  return { data: unwrapOne<Page>(response, "pages") };
}
