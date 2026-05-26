# @ikko-dev/ghost-tools

Ghost CMS tools — TypeScript SDK and MCP server for [Ghost](https://ghost.org) blogging platform.

A monorepo of packages for interacting with Ghost instances from AI agents
(via the Model Context Protocol) and humans (via the SDK or directly).

Ghost already ships a fully featured [`ghost` CLI](https://ghost.org/docs/ghost-cli/),
so this repo intentionally omits the CLI package and focuses on the API client,
SDK, shared executors, and MCP server.

## Packages

| Package | Description |
| ------- | ----------- |
| [`@ikko-dev/ghost-api`](./packages/api) | Low-level HTTP client for Ghost Admin + Content APIs (JWT signing, fetch wrapper, types). |
| [`@ikko-dev/ghost-core`](./packages/core) | Shared business logic — executors, routes, context. Used by both the SDK and the MCP server. |
| [`@ikko-dev/ghost-sdk`](./packages/sdk) | Fluent TypeScript SDK on top of the API client. |
| [`@ikko-dev/ghost-mcp`](./packages/mcp) | MCP server (stdio + Streamable HTTP) — exposes Ghost as MCP tools for Claude and other agents. |

## Architecture

Mirrors [`@studiometa/forge-tools`](https://github.com/studiometa/forge-tools) and
[`@studiometa/productive-tools`](https://github.com/studiometa/productive-tools):

```
api  →  core  →  sdk
            ↘
             mcp  (stdio + HTTP)
```

- **`api`** has no workspace dependencies — pure HTTP client + types.
- **`core`** depends on `api` — wraps requests in executors with a `ROUTES` registry.
- **`sdk`** depends on `api` — fluent chainable resource builders.
- **`mcp`** depends on `api` and `core` — wraps executors as MCP tools.

## MCP read/write split

The MCP server exposes **two** tools so MCP clients can request finer-grained
authorization:

- `ghost` — read-only operations (`browse`, `read`, `help`, `schema`)
- `ghost_write` — mutating operations (`add`, `edit`, `delete`, `copy`, `upload`, `activate`)

This lets users auto-approve reads while still confirming every write.

## MCP authentication

The HTTP MCP server is **stateless** — there's no per-user storage on the server.
Users connect by visiting `/authorize`, entering their **Ghost site URL** and
**Staff Access Token** into a login form, and the server packs those into an
OAuth 2.1 authorization code (PKCE) that the MCP client (Claude Desktop,
claude.ai, etc.) holds locally. Each tool call carries those credentials as a
Bearer token; the server signs a short-lived JWT and talks to the Ghost API for
that one request.

This matches the auth pattern used by `forge-tools` and `productive-tools`.

## Quick start

```bash
npm install
npm run build
```

Run the stdio MCP server (for Claude Desktop config):

```bash
GHOST_URL=https://my-blog.ghost.io \
GHOST_STAFF_TOKEN=000000000000000000000000:abcdef... \
npx ghost-mcp
```

Run the HTTP MCP server (for remote MCP clients):

```bash
PORT=3000 npx ghost-mcp-server
```

Then visit `http://localhost:3000/authorize` from your MCP client.

## License

MIT
