// ── Options ──────────────────────────────────────────

/**
 * Ghost API client options.
 */
export interface GhostOptions {
  /** Custom fetch implementation (for testing). */
  fetch?: typeof globalThis.fetch;
  /** Accept-Version header value (e.g. "v5.0"). */
  acceptVersion?: string;
}

/**
 * Credentials for the Admin API.
 *
 * The staff access token is in the form `{hexId}:{hexSecret}` as displayed
 * in Ghost Admin → Settings → Integrations → Add custom integration.
 */
export interface AdminCredentials {
  /** Base URL of the Ghost site, e.g. "https://my-blog.ghost.io". No trailing slash. */
  url: string;
  /** Staff access token in `id:secret` format. */
  staffAccessToken: string;
}

/**
 * Credentials for the Content API.
 *
 * The content API key is the 26-character hex value from a custom integration.
 */
export interface ContentCredentials {
  /** Base URL of the Ghost site, e.g. "https://my-blog.ghost.io". No trailing slash. */
  url: string;
  /** Content API key (26 hex chars). */
  contentApiKey: string;
}

// ── Config types ─────────────────────────────────────

export interface GhostConfig {
  /** Default Ghost site URL. */
  url?: string;
  /** Default staff access token (`id:secret`). */
  staffAccessToken?: string;
  /** Default content API key. */
  contentApiKey?: string;
}

// ── Generic API envelope ─────────────────────────────

/**
 * Ghost API responses wrap resources in an array named after the resource
 * (except `/site/` and `/settings/` which return `{ site: {...} }` / `{ settings: {...} }`).
 *
 * Example: `GET /posts/` returns `{ posts: Post[], meta: { pagination: {...} } }`.
 */
export interface GhostEnvelope<T> {
  [resource: string]: T[] | Meta | T | undefined;
  meta?: Meta;
}

export interface Meta {
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  pages: number;
  total: number;
  next: number | null;
  prev: number | null;
}

// ── Browse query parameters ──────────────────────────

export interface BrowseParams {
  /** NQL filter expression, e.g. `status:published+tag:news`. */
  filter?: string;
  /** Comma-separated includes, e.g. `authors,tags`. */
  include?: string;
  /** Comma-separated field list, e.g. `id,title,slug`. */
  fields?: string;
  /** Content format(s), e.g. `html`, `mobiledoc`, `lexical`, `plaintext`. */
  formats?: string;
  /** Page size (default 15, max 100). */
  limit?: number | 'all';
  /** Page number (1-indexed). */
  page?: number;
  /** Sort order, e.g. `published_at desc`. */
  order?: string;
}

export interface ReadParams {
  include?: string;
  fields?: string;
  formats?: string;
}
