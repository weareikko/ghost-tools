# @ikko-dev/ghost-mcp

MCP (Model Context Protocol) server for Ghost CMS. Provides two tools — `ghost`
for reads and `ghost_write` for writes — over both stdio and Streamable HTTP
transports.

## Tools

### `ghost` — read operations

```
ghost(resource, action, [parameters...])
```

| Action   | Notes                                                               |
| -------- | ------------------------------------------------------------------- |
| `browse` | List resources with NQL filter, include, fields, limit, page, order |
| `read`   | Fetch one resource by `id` or `slug`                                |
| `help`   | Resource documentation                                              |
| `schema` | Field shape reference                                               |

### `ghost_write` — write operations

```
ghost_write(resource, action, payload?, ...)
```

| Action     | Notes                                                |
| ---------- | ---------------------------------------------------- |
| `add`      | Create a new resource — pass `payload: {...}`        |
| `edit`     | Update by `id` — pass `payload: { updated_at, ... }` |
| `delete`   | Remove by `id`                                       |
| `copy`     | Duplicate a post or page (creates a draft)           |
| `upload`   | Upload a base64-encoded image or theme zip           |
| `activate` | Activate an uploaded theme                           |

### Resources

| Resource      | API             | `ghost` | `ghost_write` |
| ------------- | --------------- | :-----: | :-----------: |
| `posts`       | Admin + Content |    ✓    |       ✓       |
| `pages`       | Admin + Content |    ✓    |       ✓       |
| `tags`        | Admin + Content |    ✓    |       ✓       |
| `tiers`       | Admin + Content |    ✓    |       ✓       |
| `authors`     | Content only    |    ✓    |       —       |
| `members`     | Admin           |    ✓    |       ✓       |
| `newsletters` | Admin           |    ✓    |       ✓       |
| `offers`      | Admin           |    ✓    |       ✓       |
| `users`       | Admin           |    ✓    |       ✓       |
| `roles`       | Admin           |    ✓    |       —       |
| `invites`     | Admin           |    ✓    |       ✓       |
| `webhooks`    | Admin           |    —    |       ✓       |
| `images`      | Admin           |    —    |       ✓       |
| `themes`      | Admin           |    —    |       ✓       |
| `site`        | Admin           |    ✓    |       —       |
| `settings`    | Admin           |    ✓    |       ✓       |

## Run modes

### Stdio (Claude Desktop)

```json
{
  "mcpServers": {
    "ghost": {
      "command": "ghost-mcp",
      "env": {
        "GHOST_URL": "https://my-blog.ghost.io",
        "GHOST_STAFF_TOKEN": "id:hex-secret"
      }
    }
  }
}
```

Pass `--read-only` (or set `GHOST_READ_ONLY=true`) to disable `ghost_write`.

### HTTP — Admin mode (OAuth 2.1)

The default HTTP mode. Users authenticate via a login form at `/authorize`.

```bash
PORT=3000 OAUTH_SECRET=$(openssl rand -hex 32) npx ghost-mcp-server
```

Point your MCP client at `http://localhost:3000/mcp`. On first connect the
client is redirected to `/authorize`, where the user enters:

- **Ghost site URL** — `https://my-blog.ghost.io`
- **Staff Access Token** — `id:hex-secret` from a Custom Integration
- **Content API key** _(optional)_ — only needed for `authors`

The server is stateless — credentials are AES-256-GCM-encrypted into the OAuth
authorization code, then base64url-encoded into the access token the MCP client
holds and sends as `Authorization: Bearer <token>` on each call.

### HTTP — Public content mode

No authentication. Pre-configured at startup for a single Ghost site. Exposes
`posts`, `pages`, `tags`, `tiers`, `authors` via the Ghost Content API. Only
browse/read operations are available; `ghost_write` is not registered.

```bash
GHOST_URL=https://my-blog.ghost.io \
GHOST_CONTENT_KEY=<26-char-hex> \
npx ghost-mcp-server --public
# or: GHOST_PUBLIC=true
```

Point public or unauthenticated clients at `http://localhost:3000/mcp`.

### HTTP — Dual mode (public + admin on one server)

Serves both endpoints from a single process:

| Path         | Auth          | Resources                       |
| ------------ | ------------- | ------------------------------- |
| `/mcp`       | None (public) | Content API only                |
| `/admin/mcp` | OAuth 2.1     | All resources (admin + content) |

```bash
GHOST_URL=https://my-blog.ghost.io \
GHOST_CONTENT_KEY=<26-char-hex> \
OAUTH_SECRET=$(openssl rand -hex 32) \
npx ghost-mcp-server --dual
# or: GHOST_DUAL=true
```

`/.well-known/oauth-protected-resource` advertises `/admin/mcp` as the
protected resource so MCP clients discover the correct OAuth flow. The public
`/mcp` endpoint returns no OAuth headers — clients connect directly.

## Environment variables

| Variable            | Description                                             | Required    |
| ------------------- | ------------------------------------------------------- | ----------- |
| `GHOST_URL`         | Ghost site URL (no trailing slash)                      | public/dual |
| `GHOST_CONTENT_KEY` | Content API key (26-char hex from a Custom Integration) | public/dual |
| `OAUTH_SECRET`      | 64-char hex AES-256-GCM key for OAuth token encryption  | HTTP admin  |
| `PORT`              | HTTP listen port (default `3000`)                       | —           |
| `HOST`              | HTTP bind address (default `0.0.0.0`)                   | —           |
| `GHOST_READ_ONLY`   | Set `true` to disable `ghost_write`                     | —           |
| `GHOST_PUBLIC`      | Set `true` to enable public content mode                | —           |
| `GHOST_DUAL`        | Set `true` to enable dual mode                          | —           |

`--public` and `--dual` are mutually exclusive. Using both exits with an error.

## Architecture

```
stdio.ts ─┐
          ├─→ handlers.ts ─→ @ikko-dev/ghost-core executors ─→ @ikko-dev/ghost-api
http.ts ──┘     ↑
                │ (publicMode → dispatchContent → CONTENT_ROUTES)
oauth.ts (login form)   sessions.ts (per-session transport+server)
```

### Content API dispatch

When the server runs in public or dual mode, `executeToolWithCredentials` receives
`publicMode = true` and routes all calls through `dispatchContent` instead of the
normal admin `dispatch`. `dispatchContent` accepts only `CONTENT_RESOURCES`
(`posts`, `pages`, `tags`, `tiers`, `authors`) and only `browse`/`read` actions,
hitting `CONTENT_ROUTES` (paths identical to admin routes, but with `api: 'content'`
so `GhostHttpClient` appends `?key=<contentApiKey>` instead of a JWT).

This mirrors `@studiometa/forge-tools` and `@studiometa/productive-tools`.
