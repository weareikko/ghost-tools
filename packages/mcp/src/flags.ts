/**
 * CLI flag parsers shared by stdio and HTTP entry points.
 *
 * Extracted to break a Vite code-splitting bug that would otherwise make the
 * `isMainModule` guard in `index.ts` unreliable.
 */

export function parseReadOnlyFlag(): boolean {
  return process.argv.includes('--read-only') || process.env.GHOST_READ_ONLY === 'true';
}
