import { describe, expect, it, vi } from "vitest";

import { GhostApiError } from "./errors.ts";
import { GhostHttpClient } from "./client.ts";

const ADMIN = {
  url: "https://example.ghost.io",
  staffAccessToken: "myid:cafebabe",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GhostHttpClient", () => {
  it("rejects construction without any credentials", () => {
    expect(() => new GhostHttpClient({})).toThrow(/admin or content/);
  });

  it("adds Ghost JWT auth and Accept-Version headers on admin requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ posts: [] }));
    const client = new GhostHttpClient({ admin: ADMIN }, { fetch: fetchMock });

    await client.admin_("GET", "/posts");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.ghost.io/ghost/api/admin/posts/");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Ghost [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(headers["Accept-Version"]).toBe("v5.0");
  });

  it("appends `key=` query param for content API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ posts: [] }));
    const client = new GhostHttpClient(
      { content: { url: "https://example.ghost.io", contentApiKey: "abc123" } },
      { fetch: fetchMock },
    );

    await client.content_("GET", "/posts");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.ghost.io/ghost/api/content/posts/?key=abc123");
  });

  it("serializes JSON body on writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ posts: [{ id: "1" }] }));
    const client = new GhostHttpClient({ admin: ADMIN }, { fetch: fetchMock });

    await client.admin_("POST", "/posts", { posts: [{ title: "Hi" }] });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ posts: [{ title: "Hi" }] }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("throws GhostApiError on non-2xx responses, preserving Ghost error details", async () => {
    const errorBody = {
      errors: [
        { message: "Validation failed", context: "Slug must be unique", type: "ValidationError" },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(errorBody, 422));
    const client = new GhostHttpClient({ admin: ADMIN }, { fetch: fetchMock });

    await expect(client.admin_("POST", "/posts", {})).rejects.toMatchObject({
      name: "GhostApiError",
      status: 422,
      message: "Validation failed — Slug must be unique",
    });
  });

  it("falls back to a status-based message when the error body has no `errors` field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Nope", { status: 401 }));
    const client = new GhostHttpClient({ admin: ADMIN }, { fetch: fetchMock });

    try {
      await client.admin_("GET", "/posts");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(GhostApiError);
      expect((error as GhostApiError).status).toBe(401);
      expect((error as GhostApiError).message).toMatch(/Invalid credentials/);
    }
  });

  it("returns undefined on 204 No Content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = new GhostHttpClient({ admin: ADMIN }, { fetch: fetchMock });

    const result = await client.admin_("DELETE", "/posts/1");
    expect(result).toBeUndefined();
  });
});
