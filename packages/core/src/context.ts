import type { GhostHttpClient } from "@ikko-dev/ghost-api";

/**
 * Execution context injected into every executor.
 *
 * Uses DI for testability — tests inject a mock client via
 * `createTestExecutorContext()`.
 */
export interface ExecutorContext {
  /** HTTP client for Ghost API calls. */
  client: GhostHttpClient;
  /** Which API to call by default — Admin (signed JWT) or Content (key=). */
  api: "admin" | "content";
}

/**
 * Result of an executor function.
 */
export interface ExecutorResult<T> {
  data: T;
}

/**
 * Create a test executor context with a stub client.
 */
export function createTestExecutorContext(
  overrides: Partial<ExecutorContext> = {},
): ExecutorContext {
  const stub = new Proxy({} as GhostHttpClient, {
    get:
      (_target, prop) =>
      (..._args: unknown[]) => {
        throw new Error(
          `GhostHttpClient.${String(prop)}() called without mock — inject a mock client in createTestExecutorContext()`,
        );
      },
  });

  return {
    client: stub,
    api: "admin",
    ...overrides,
  };
}
