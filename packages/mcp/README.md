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

`posts`, `pages`, `tags`, `members`, `tiers`, `newsletters`, `offers`, `users`,
`roles`, `invites`, `webhooks`, `images`, `themes`, `site`, `settings`,
`authors` (Content API).

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

### HTTP (claude.ai, remote MCP clients)

```bash
PORT=3000 OAUTH_SECRET=$(openssl rand -hex 32) npx ghost-mcp-server
```

Then point your MCP client at `http://localhost:3000/mcp`. On first connect the
client redirects to `/authorize`, where the user enters:

- **Ghost site URL** — `https://my-blog.ghost.io`
- **Staff Access Token** — `id:hex-secret` from a Custom Integration
- **Content API key** _(optional)_ — to use the Content API for authors

The server is stateless: nothing is stored on disk. The user's credentials are
AES-256-GCM-encrypted into the OAuth authorization code, then turned into a
base64url-encoded JSON access token that the MCP client holds locally and sends
as `Authorization: Bearer <token>` on each call.

## Architecture

```
stdio.ts ─┐
          ├─→ handlers.ts ─→ @ikko-dev/ghost-core executors ─→ @ikko-dev/ghost-api
http.ts ──┘                      ↑
                                 │
oauth.ts (login form)   sessions.ts (per-session transport+server)
```

This mirrors `@studiometa/forge-tools` and `@studiometa/productive-tools`.
