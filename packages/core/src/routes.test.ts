import { describe, expect, it } from "vitest";

import { buildPath, CONTENT_ROUTES, ROUTES } from "./routes.ts";

describe("buildPath", () => {
  it("returns the path verbatim when no placeholders", () => {
    expect(buildPath(ROUTES.posts.browse)).toBe("/posts");
  });

  it("replaces a single placeholder", () => {
    expect(buildPath(ROUTES.posts.read, { id: "abc123" })).toBe("/posts/abc123");
  });

  it("throws when a required placeholder is missing", () => {
    expect(() => buildPath(ROUTES.posts.read, {})).toThrow(/Missing route params: id/);
  });

  it("URL-encodes path parameters", () => {
    expect(buildPath(ROUTES.posts.readBySlug, { slug: "hello world" })).toBe(
      "/posts/slug/hello%20world",
    );
  });
});

describe("ROUTES", () => {
  it("marks the Content API for authors", () => {
    expect(ROUTES.authors.browse.api).toBe("content");
  });

  it("marks the Admin API for posts", () => {
    expect(ROUTES.posts.browse.api).toBe("admin");
  });
});

describe("CONTENT_ROUTES", () => {
  it("marks all routes as content API", () => {
    for (const [resource, routes] of Object.entries(CONTENT_ROUTES)) {
      for (const [action, route] of Object.entries(routes)) {
        expect(route.api, `${resource}.${action} should be content`).toBe("content");
      }
    }
  });

  it("covers posts, pages, tags, tiers", () => {
    expect(Object.keys(CONTENT_ROUTES).toSorted()).toEqual(["pages", "posts", "tags", "tiers"]);
  });

  it("posts has browse, read, readBySlug", () => {
    expect(Object.keys(CONTENT_ROUTES.posts).toSorted()).toEqual(["browse", "read", "readBySlug"]);
  });

  it("tiers has browse and read but no readBySlug", () => {
    expect(Object.keys(CONTENT_ROUTES.tiers).toSorted()).toEqual(["browse", "read"]);
  });

  it("content paths match admin paths", () => {
    expect(CONTENT_ROUTES.posts.browse.path).toBe(ROUTES.posts.browse.path);
    expect(CONTENT_ROUTES.tags.readBySlug.path).toBe(ROUTES.tags.readBySlug.path);
  });

  it("uses GET for all routes", () => {
    for (const routes of Object.values(CONTENT_ROUTES)) {
      for (const route of Object.values(routes)) {
        expect(route.method).toBe("GET");
      }
    }
  });
});
