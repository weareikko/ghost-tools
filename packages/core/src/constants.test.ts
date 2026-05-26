import { describe, expect, it } from "vitest";

import {
  CONTENT_RESOURCES,
  isContentResource,
  isReadAction,
  isWriteAction,
  READ_ACTIONS,
  RESOURCES,
  WRITE_ACTIONS,
} from "./constants.ts";

describe("constants", () => {
  it("read and write action sets are disjoint", () => {
    const overlap = (READ_ACTIONS as readonly string[]).filter((a) =>
      (WRITE_ACTIONS as readonly string[]).includes(a),
    );
    expect(overlap).toEqual([]);
  });

  it("isReadAction identifies read actions", () => {
    expect(isReadAction("browse")).toBe(true);
    expect(isReadAction("add")).toBe(false);
  });

  it("isWriteAction identifies write actions", () => {
    expect(isWriteAction("add")).toBe(true);
    expect(isWriteAction("browse")).toBe(false);
  });
});

describe("CONTENT_RESOURCES", () => {
  it("contains exactly the five Content API resources", () => {
    expect([...CONTENT_RESOURCES].toSorted()).toEqual([
      "authors",
      "pages",
      "posts",
      "tags",
      "tiers",
    ]);
  });

  it("is a strict subset of RESOURCES", () => {
    const all = new Set<string>(RESOURCES);
    for (const r of CONTENT_RESOURCES) {
      expect(all.has(r), `"${r}" missing from RESOURCES`).toBe(true);
    }
  });

  it("isContentResource returns true for content resources", () => {
    for (const r of CONTENT_RESOURCES) {
      expect(isContentResource(r), `expected "${r}" to be a content resource`).toBe(true);
    }
  });

  it("isContentResource returns false for admin-only resources", () => {
    for (const r of [
      "members",
      "newsletters",
      "offers",
      "users",
      "roles",
      "invites",
      "webhooks",
      "images",
      "themes",
      "site",
      "settings",
    ]) {
      expect(isContentResource(r), `expected "${r}" NOT to be a content resource`).toBe(false);
    }
  });

  it("isContentResource returns false for unknown strings", () => {
    expect(isContentResource("spaceships")).toBe(false);
    expect(isContentResource("")).toBe(false);
  });
});
