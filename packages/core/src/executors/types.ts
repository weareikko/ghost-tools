/**
 * Shared executor types.
 *
 * Executors are pure business logic:
 *   (options, context) => Promise<ExecutorResult<T>>
 *
 * They never perform side effects (no `console.log`, no `process.exit`).
 * Adapters (SDK, MCP) handle all I/O.
 */

import type { ExecutorContext, ExecutorResult } from "../context.ts";

export type Executor<TOptions, TData> = (
  options: TOptions,
  ctx: ExecutorContext,
) => Promise<ExecutorResult<TData>>;

/**
 * Options common to every browse executor — pass through to Ghost as query params.
 */
export interface BrowseOptions {
  filter?: string;
  include?: string;
  fields?: string;
  formats?: string;
  limit?: number | "all";
  page?: number;
  order?: string;
}

/**
 * Options common to every read executor.
 */
export interface ReadOptions {
  id?: string;
  /** Read by slug instead of id, when supported by the resource. */
  slug?: string;
  include?: string;
  fields?: string;
  formats?: string;
}

/**
 * Build a Ghost-compatible query object from browse/read options.
 *
 * Drops `id`/`slug` (those go into the path, not the query string).
 */
export function browseQuery(opts: BrowseOptions): Record<string, string | number | undefined> {
  return {
    filter: opts.filter,
    include: opts.include,
    fields: opts.fields,
    formats: opts.formats,
    limit: opts.limit === undefined ? undefined : String(opts.limit),
    page: opts.page,
    order: opts.order,
  };
}

export function readQuery(opts: ReadOptions): Record<string, string | number | undefined> {
  return {
    include: opts.include,
    fields: opts.fields,
    formats: opts.formats,
  };
}
