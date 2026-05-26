# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.2] — 2026-05-26

### Added

#### `@ikko-dev/ghost-core`

- **`CONTENT_RESOURCES`** constant — tuple of the five Ghost Content API
  resources (`posts`, `pages`, `tags`, `tiers`, `authors`).
- **`isContentResource(r)`** type guard — returns `true` when `r` is one of the
  five Content API resources.
- **`CONTENT_ROUTES`** — route definitions (identical paths to their Admin API
  counterparts, `api: 'content'`) for `posts`, `pages`, `tags`, and `tiers`.
  `authors` already had content routes; they remain in `ROUTES.authors`.
- **Content API executor variants** — `browsePostsContent`, `readPostContent`,
  `browsePagesContent`, `readPageContent`, `browseTagsContent`, `readTagContent`,
  `browseTiersContent`, `readTierContent`. Each mirrors its admin counterpart but
  calls `CONTENT_ROUTES` so `GhostHttpClient` uses `content_()` (key-in-query)
  instead of `admin_()` (JWT auth).

#### `@ikko-dev/ghost-mcp`

- **Public content mode** (`--public` / `GHOST_PUBLIC=true`) — HTTP server mode
  that requires no authentication. Credentials (`GHOST_URL` + `GHOST_CONTENT_KEY`)
  are pre-loaded from env at startup. Only the `ghost` tool is registered, scoped
  to the five Content API resources. All `/mcp` requests receive injected
  credentials; no Bearer token or OAuth flow is needed.

- **Dual mode** (`--dual` / `GHOST_DUAL=true`) — single process, two endpoints:
  - `/mcp` — public content (no auth, Content API only)
  - `/admin/mcp` — admin (OAuth 2.1 + PKCE, all resources)

  `/.well-known/oauth-protected-resource` advertises `/admin/mcp` as the
  protected resource. Two independent `SessionManager` instances prevent
  cross-endpoint session reuse.

- **`createProtectedResourceHandler(mcpPath?)`** — factory for the OAuth
  protected-resource metadata handler. Allows `createHealthApp` to advertise the
  correct resource URL in dual mode (`/admin/mcp` instead of `/mcp`).

- **`PUBLIC_INSTRUCTIONS`** — MCP server instructions sent in public mode,
  scoped to Content API resources and read-only actions.

- **`PUBLIC_GHOST_READ_TOOL`** — `ghost` tool variant used in public mode; its
  `resource` enum is restricted to `CONTENT_RESOURCES` so LLMs don't attempt
  admin resources that will always fail.

- **`parseDualModeFlag()`** — parses `--dual` / `GHOST_DUAL=true`.

- **`dispatchContent()`** (internal) — dedicated dispatch function for public
  mode; routes browse/read for all five Content API resources to their content
  executor variants; returns a descriptive error for admin-only resources or
  unsupported actions.

- **`executeToolWithCredentials`** gains an optional `publicMode` parameter that
  short-circuits to `dispatchContent` instead of the normal admin `dispatch`.

- **`HttpServerOptions._publicCredentials`** — pre-validated credentials for
  public mode, injected at startup and used per-request instead of parsing a
  Bearer token.

- **`HealthAppOptions.adminMcpPath`** — configures `createHealthApp` to pass the
  correct path to `createProtectedResourceHandler`.

### Changed

- `createHealthApp()` now accepts an optional `HealthAppOptions` object. Existing
  call sites with no arguments are unaffected.
- `protectedResourceHandler` (the named export) is now a default instance of the
  new factory (`createProtectedResourceHandler()`), maintaining backward
  compatibility.

### Fixed

- **`h3` upgraded to `2.0.1-rc.22`** — resolves four CVEs (SSE event injection,
  middleware bypass, timing discrepancy in basic auth, unbounded chunked cookie DoS).
- **Publish workflow** — upgraded to `actions/setup-node@v6` (fixes `ENEEDAUTH`
  caused by `v4` writing an empty auth token to `.npmrc`); added
  `environment: production` to match npm trusted publisher configuration; removed
  now-unnecessary `NODE_AUTH_TOKEN` from publish steps.

---

## Notes

- `--public` and `--dual` are mutually exclusive; using both exits with an error
  at startup.
- In dual mode, `--read-only` applies to the `/admin/mcp` endpoint only.
- In public or dual mode, `GHOST_URL` and `GHOST_CONTENT_KEY` are validated at
  startup — missing values cause an immediate exit with a clear error message.
