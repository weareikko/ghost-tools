import type { Meta } from "./types.ts";

/**
 * Pull the first item out of a Ghost envelope.
 *
 * Ghost always wraps resources in arrays — even single-resource reads come back
 * as `{ posts: [post] }`. This unwraps that pattern.
 *
 * Returns `undefined` if the envelope is empty.
 *
 * The envelope is typed as `unknown` so any locally-typed response shape can be
 * passed without ceremony.
 */
export function unwrapOne<T>(envelope: unknown, key: string): T | undefined {
  if (envelope && typeof envelope === "object") {
    const arr = (envelope as Record<string, unknown>)[key];
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[0] as T;
    }
  }
  return undefined;
}

/**
 * Pull the full array out of a Ghost envelope.
 */
export function unwrapMany<T>(envelope: unknown, key: string): T[] {
  if (envelope && typeof envelope === "object") {
    const arr = (envelope as Record<string, unknown>)[key];
    if (Array.isArray(arr)) return arr as T[];
  }
  return [];
}

export function extractMeta(envelope: unknown): Meta | undefined {
  if (envelope && typeof envelope === "object") {
    return (envelope as { meta?: Meta }).meta;
  }
  return undefined;
}

/**
 * Wrap a payload in the resource envelope Ghost expects for writes.
 * `wrapForWrite('posts', { title: 'x' })` → `{ posts: [{ title: 'x' }] }`
 */
export function wrapForWrite<T>(key: string, payload: T): Record<string, T[]> {
  return { [key]: [payload] };
}
