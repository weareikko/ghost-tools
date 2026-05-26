import type { Meta } from "@ikko-dev/ghost-api";

/**
 * Async iterator over every page of a Ghost browse endpoint.
 *
 * Usage:
 * ```ts
 * for await (const post of paginate((page) => sdk.posts.browse({ page }))) {
 *   console.log(post.title);
 * }
 * ```
 */
export async function* paginate<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; meta?: Meta }>,
): AsyncGenerator<T> {
  let page = 1;
  while (true) {
    const { items, meta } = await fetchPage(page);
    for (const item of items) yield item;
    const next = meta?.pagination?.next;
    if (next === null || next === undefined) return;
    page = next;
  }
}
