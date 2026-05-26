import type { Tier } from "@ikko-dev/ghost-api";
import { unwrapMany, unwrapOne, wrapForWrite } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";
import { CONTENT_ROUTES, ROUTES, request } from "../routes.ts";
import type { BrowseOptions, ReadOptions } from "./types.ts";
import { browseQuery, readQuery } from "./types.ts";

interface TiersEnvelope {
  tiers: Tier[];
  meta?: { pagination?: unknown };
}

export async function browseTiers(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ tiers: Tier[]; meta?: unknown }>> {
  const response = await request<TiersEnvelope>(
    ROUTES.tiers.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { tiers: unwrapMany<Tier>(response, "tiers"), meta: response.meta } };
}

export async function readTier(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Tier | undefined>> {
  if (!options.id) throw new Error("readTier requires id.");
  const response = await request<TiersEnvelope>(
    ROUTES.tiers.read,
    ctx,
    { id: options.id },
    {
      query: readQuery(options),
    },
  );
  return { data: unwrapOne<Tier>(response, "tiers") };
}

export interface AddTierOptions extends Partial<Tier> {
  name: string;
}

export async function addTier(
  options: AddTierOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Tier | undefined>> {
  const response = await request<TiersEnvelope>(
    ROUTES.tiers.add,
    ctx,
    {},
    {
      body: wrapForWrite("tiers", options),
    },
  );
  return { data: unwrapOne<Tier>(response, "tiers") };
}

export interface EditTierOptions extends Partial<Tier> {
  id: string;
}

export async function editTier(
  options: EditTierOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Tier | undefined>> {
  const { id, ...body } = options;
  const response = await request<TiersEnvelope>(
    ROUTES.tiers.edit,
    ctx,
    { id },
    {
      body: wrapForWrite("tiers", body),
    },
  );
  return { data: unwrapOne<Tier>(response, "tiers") };
}

// ── Content API variants (public, read-only) ─────────────────────────────────

export async function browseTiersContent(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ tiers: Tier[]; meta?: unknown }>> {
  const response = await request<TiersEnvelope>(
    CONTENT_ROUTES.tiers.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { tiers: unwrapMany<Tier>(response, "tiers"), meta: response.meta } };
}

export async function readTierContent(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Tier | undefined>> {
  if (!options.id) throw new Error("readTierContent requires id.");
  const response = await request<TiersEnvelope>(
    CONTENT_ROUTES.tiers.read,
    ctx,
    { id: options.id },
    {
      query: readQuery(options),
    },
  );
  return { data: unwrapOne<Tier>(response, "tiers") };
}
