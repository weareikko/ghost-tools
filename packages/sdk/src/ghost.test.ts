import { describe, expect, it, vi } from "vitest";

import { Ghost } from "./ghost.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Ghost SDK", () => {
  it("posts.browse returns an unwrapped array", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        posts: [
          { id: "1", title: "A" },
          { id: "2", title: "B" },
        ],
        meta: {},
      }),
    );
    const ghost = new Ghost(
      { admin: { url: "https://x.ghost.io", staffAccessToken: "id:cafe" } },
      { fetch: fetchMock },
    );

    const { items } = await ghost.posts.browse({ limit: 2 });
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("A");
  });

  it("contentPosts uses the content API path with ?key=", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ posts: [] }));
    const ghost = new Ghost(
      { content: { url: "https://x.ghost.io", contentApiKey: "abc" } },
      { fetch: fetchMock },
    );

    await ghost.contentPosts.browse();
    const url: string = fetchMock.mock.calls[0][0];
    expect(url).toContain("/ghost/api/content/posts/");
    expect(url).toContain("key=abc");
  });

  it("posts.copy POSTs to /posts/{id}/copy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ posts: [{ id: "new" }] }));
    const ghost = new Ghost(
      { admin: { url: "https://x.ghost.io", staffAccessToken: "id:cafe" } },
      { fetch: fetchMock },
    );

    const copy = await ghost.posts.copy("abc");
    expect(copy?.id).toBe("new");
    expect(fetchMock.mock.calls[0][0]).toBe("https://x.ghost.io/ghost/api/admin/posts/abc/copy/");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
});
