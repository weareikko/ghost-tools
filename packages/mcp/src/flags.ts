/**
 * CLI flag parsers shared by stdio and HTTP entry points.
 *
 * Extracted to break a Vite code-splitting bug that would otherwise make the
 * `isMainModule` guard in `index.ts` unreliable.
 */

export function parseReadOnlyFlag(): boolean {
  return process.argv.includes("--read-only") || process.env.GHOST_READ_ONLY === "true";
}

export function parsePublicFlag(): boolean {
  return process.argv.includes("--public") || process.env.GHOST_PUBLIC === "true";
}

export function parseDualModeFlag(): boolean {
  return process.argv.includes("--dual") || process.env.GHOST_DUAL === "true";
}

/**
 * Returns the value of `GHOST_URL_LOCK` if set, otherwise `undefined`.
 *
 * When set, the OAuth login form pre-fills the Ghost site URL field with this
 * value and marks it as read-only, and the `POST /authorize` handler ignores
 * whatever the client submits for `ghostUrl` and always uses this value instead.
 */
export function parseGhostUrlLock(): string | undefined {
  return process.env.GHOST_URL_LOCK?.trim() || undefined;
}
