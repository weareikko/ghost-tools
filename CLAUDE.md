# Project: @ikko-dev/ghost-tools

Ghost CMS tools — TypeScript SDK and MCP server. Monorepo with `api`, `core`, `sdk`, `mcp` packages, modeled after `studiometa/forge-tools` and `studiometa/productive-tools`. **No CLI package** — Ghost ships its own `ghost` CLI.

## Architecture

```
api (HTTP client, JWT signing, types)
 ├── core (executors, routes, context)
 │    └── mcp (stdio + Streamable HTTP, ghost / ghost_write tools)
 └── sdk (fluent chainable resources)
```

- `api` has zero workspace deps.
- `core` and `sdk` depend on `api`.
- `mcp` depends on `api` and `core`.

## MCP design

Two tools, deliberately split so clients can prompt differently:

- `ghost` — read-only (`browse`, `read`, `help`, `schema`)
- `ghost_write` — mutating (`add`, `edit`, `delete`, `copy`, `upload`, `activate`)

Ghost API verbs in the wild: Browse, Read, Edit, Add, Copy, Delete, Upload, Activate. We map them to MCP actions of the same names.

## Auth

**Stateless** — server stores nothing. Two transports:

- **stdio**: reads `GHOST_URL` + `GHOST_STAFF_TOKEN` (or `GHOST_CONTENT_KEY`) from env / config file.
- **HTTP**: OAuth 2.1 with PKCE. User visits `/authorize`, enters Ghost URL + Staff Access Token in a login form, server encrypts them into an authorization code, client exchanges it for an access token, then sends `Authorization: Bearer base64({ghostUrl, staffToken})` on every call.

Staff Access Token format is `{hexId}:{hexSecret}` — the server uses it to sign a short-lived (≤5 min) HS256 JWT with `kid={id}` and `aud=/admin/`.

## Conventions

- ES modules, `.ts` extensions in imports (vite + tsgo style).
- `oxlint` + `oxfmt`. Run `npm run check` before commits.
- Strict TypeScript, no `any` without an `eslint-disable` justification.
- Executors are pure: `(options, ctx) => Promise<ExecutorResult<T>>`. No I/O side effects (no `console.log`, no `process.exit`). All I/O is in adapters (CLI/MCP).
- Each resource lives in its own folder under `core/src/executors/`.
- Tests are colocated as `*.test.ts` next to source.
