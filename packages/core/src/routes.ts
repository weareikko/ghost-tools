/**
 * Single source of truth for Ghost API endpoint paths and methods.
 *
 * Paths are relative to the API base (`/ghost/api/admin` or `/ghost/api/content`)
 * which is prepended by `GhostHttpClient.admin_()` / `content_()`.
 *
 * `:id` and `:slug` placeholders are replaced by `buildPath`.
 */

import type { GhostHttpClient } from "@ikko-dev/ghost-api";

import type { ExecutorContext } from "./context.ts";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiKind = "admin" | "content";

export interface RouteDefinition {
  method: HttpMethod;
  /** Path relative to /ghost/api/admin or /ghost/api/content. Must start with `/`. */
  path: string;
  /** Which API this route lives on. Defaults to the route group's default. */
  api: ApiKind;
}

export type RouteParams = Record<string, string | number | undefined>;

// ── Route definitions ────────────────────────────────

export const ROUTES = {
  posts: {
    browse: { method: "GET", path: "/posts", api: "admin" },
    read: { method: "GET", path: "/posts/:id", api: "admin" },
    readBySlug: { method: "GET", path: "/posts/slug/:slug", api: "admin" },
    add: { method: "POST", path: "/posts", api: "admin" },
    edit: { method: "PUT", path: "/posts/:id", api: "admin" },
    delete: { method: "DELETE", path: "/posts/:id", api: "admin" },
    copy: { method: "POST", path: "/posts/:id/copy", api: "admin" },
  },
  pages: {
    browse: { method: "GET", path: "/pages", api: "admin" },
    read: { method: "GET", path: "/pages/:id", api: "admin" },
    readBySlug: { method: "GET", path: "/pages/slug/:slug", api: "admin" },
    add: { method: "POST", path: "/pages", api: "admin" },
    edit: { method: "PUT", path: "/pages/:id", api: "admin" },
    delete: { method: "DELETE", path: "/pages/:id", api: "admin" },
    copy: { method: "POST", path: "/pages/:id/copy", api: "admin" },
  },
  tags: {
    browse: { method: "GET", path: "/tags", api: "admin" },
    read: { method: "GET", path: "/tags/:id", api: "admin" },
    readBySlug: { method: "GET", path: "/tags/slug/:slug", api: "admin" },
    add: { method: "POST", path: "/tags", api: "admin" },
    edit: { method: "PUT", path: "/tags/:id", api: "admin" },
    delete: { method: "DELETE", path: "/tags/:id", api: "admin" },
  },
  members: {
    browse: { method: "GET", path: "/members", api: "admin" },
    read: { method: "GET", path: "/members/:id", api: "admin" },
    add: { method: "POST", path: "/members", api: "admin" },
    edit: { method: "PUT", path: "/members/:id", api: "admin" },
  },
  tiers: {
    browse: { method: "GET", path: "/tiers", api: "admin" },
    read: { method: "GET", path: "/tiers/:id", api: "admin" },
    add: { method: "POST", path: "/tiers", api: "admin" },
    edit: { method: "PUT", path: "/tiers/:id", api: "admin" },
  },
  newsletters: {
    browse: { method: "GET", path: "/newsletters", api: "admin" },
    read: { method: "GET", path: "/newsletters/:id", api: "admin" },
    add: { method: "POST", path: "/newsletters", api: "admin" },
    edit: { method: "PUT", path: "/newsletters/:id", api: "admin" },
  },
  offers: {
    browse: { method: "GET", path: "/offers", api: "admin" },
    read: { method: "GET", path: "/offers/:id", api: "admin" },
    add: { method: "POST", path: "/offers", api: "admin" },
    edit: { method: "PUT", path: "/offers/:id", api: "admin" },
  },
  users: {
    browse: { method: "GET", path: "/users", api: "admin" },
    read: { method: "GET", path: "/users/:id", api: "admin" },
    readBySlug: { method: "GET", path: "/users/slug/:slug", api: "admin" },
    edit: { method: "PUT", path: "/users/:id", api: "admin" },
    delete: { method: "DELETE", path: "/users/:id", api: "admin" },
  },
  roles: {
    browse: { method: "GET", path: "/roles", api: "admin" },
  },
  invites: {
    browse: { method: "GET", path: "/invites", api: "admin" },
    read: { method: "GET", path: "/invites/:id", api: "admin" },
    add: { method: "POST", path: "/invites", api: "admin" },
    delete: { method: "DELETE", path: "/invites/:id", api: "admin" },
  },
  webhooks: {
    add: { method: "POST", path: "/webhooks", api: "admin" },
    edit: { method: "PUT", path: "/webhooks/:id", api: "admin" },
    delete: { method: "DELETE", path: "/webhooks/:id", api: "admin" },
  },
  images: {
    upload: { method: "POST", path: "/images/upload", api: "admin" },
  },
  themes: {
    upload: { method: "POST", path: "/themes/upload", api: "admin" },
    activate: { method: "PUT", path: "/themes/:name/activate", api: "admin" },
  },
  site: {
    read: { method: "GET", path: "/site", api: "admin" },
  },
  settings: {
    read: { method: "GET", path: "/settings", api: "admin" },
    edit: { method: "PUT", path: "/settings", api: "admin" },
  },
  // Content API
  authors: {
    browse: { method: "GET", path: "/authors", api: "content" },
    read: { method: "GET", path: "/authors/:id", api: "content" },
    readBySlug: { method: "GET", path: "/authors/slug/:slug", api: "content" },
  },
} as const satisfies Record<string, Record<string, RouteDefinition>>;

/**
 * Content API routes — read-only, no Staff Access Token required.
 *
 * Paths are identical to the Admin API counterparts; only the `api` field
 * differs. `GhostHttpClient.content_()` appends `?key=<contentApiKey>`.
 */
export const CONTENT_ROUTES = {
  posts: {
    browse: { method: "GET", path: "/posts", api: "content" },
    read: { method: "GET", path: "/posts/:id", api: "content" },
    readBySlug: { method: "GET", path: "/posts/slug/:slug", api: "content" },
  },
  pages: {
    browse: { method: "GET", path: "/pages", api: "content" },
    read: { method: "GET", path: "/pages/:id", api: "content" },
    readBySlug: { method: "GET", path: "/pages/slug/:slug", api: "content" },
  },
  tags: {
    browse: { method: "GET", path: "/tags", api: "content" },
    read: { method: "GET", path: "/tags/:id", api: "content" },
    readBySlug: { method: "GET", path: "/tags/slug/:slug", api: "content" },
  },
  tiers: {
    browse: { method: "GET", path: "/tiers", api: "content" },
    read: { method: "GET", path: "/tiers/:id", api: "content" },
  },
} as const satisfies Record<string, Record<string, RouteDefinition>>;

// ── Path builder ─────────────────────────────────────

/**
 * Replace `:param` placeholders in a route path.
 *
 * Throws on missing required params.
 */
export function buildPath(route: RouteDefinition, params: RouteParams = {}): string {
  const missing: string[] = [];
  const path = route.path.replaceAll(/:(\w+)/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined) {
      missing.push(key);
      return `:${key}`;
    }
    return encodeURIComponent(String(value));
  });

  if (missing.length > 0) {
    throw new Error(`Missing route params: ${missing.join(", ")}`);
  }

  return path;
}

// ── Request helper ───────────────────────────────────

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

/**
 * Execute a route using the context's HTTP client.
 *
 * Picks Admin vs Content based on the route's `api` field.
 */
export async function request<T = unknown>(
  route: RouteDefinition,
  ctx: ExecutorContext,
  params: RouteParams = {},
  options?: RequestOptions,
): Promise<T> {
  const path = buildPath(route, params);

  if (route.api === "content") {
    if (route.method !== "GET") {
      throw new Error(`Content API only supports GET (got ${route.method} ${path}).`);
    }
    return contentRequest<T>(ctx.client, path, options?.query);
  }

  return adminRequest<T>(ctx.client, route.method, path, options?.body, options?.query);
}

function adminRequest<T>(
  client: GhostHttpClient,
  method: HttpMethod,
  path: string,
  body: unknown,
  query: Record<string, string | number | undefined> | undefined,
): Promise<T> {
  return client.admin_<T>(method, path, body, query);
}

function contentRequest<T>(
  client: GhostHttpClient,
  path: string,
  query: Record<string, string | number | undefined> | undefined,
): Promise<T> {
  return client.content_<T>("GET", path, query);
}
