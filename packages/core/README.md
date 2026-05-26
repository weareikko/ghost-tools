# @ikko-dev/ghost-core

Shared business logic for `@ikko-dev/ghost-tools`. Pure executors with
injectable dependencies — used by both the SDK and the MCP server.

## What's inside

- `ROUTES` — single source of truth for every Ghost API endpoint and HTTP method.
- `request()` — runs a route against `GhostHttpClient`, picking Admin vs Content automatically.
- `executors/<resource>.ts` — one file per resource, exporting `browse*`, `read*`, `add*`, `edit*`, `delete*`, `copy*` functions.
- `ExecutorContext` — DI seam carrying the HTTP client.
- `RESOURCES`, `ACTIONS`, `READ_ACTIONS`, `WRITE_ACTIONS` — constants used to derive the MCP schema and authorize calls.

## Executor signature

```ts
type Executor<TOptions, TData> = (
  options: TOptions,
  ctx: ExecutorContext,
) => Promise<ExecutorResult<TData>>;
```

Executors never log, throw process-killing errors, or touch the filesystem.
That keeps them trivially testable and lets the SDK / MCP wrap them however
they need.
