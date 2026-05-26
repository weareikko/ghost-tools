import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startHttpServer } from "./server.ts";

/**
 * Unit tests for `startHttpServer` startup validation.
 *
 * We only test the fail-fast rejection paths here — they resolve before the
 * TCP listen call so no real port is opened. Integration tests that exercise
 * live HTTP traffic are out of scope for this file.
 */

describe("startHttpServer — mutual exclusion", () => {
  it("rejects when both --public and --dual are set", async () => {
    await expect(
      startHttpServer(0, "127.0.0.1", { publicMode: true, dualMode: true }),
    ).rejects.toThrow(/mutually exclusive/);
  });
});

describe("startHttpServer — public mode env validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GHOST_URL;
    delete process.env.GHOST_CONTENT_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects when GHOST_URL is missing", async () => {
    await expect(startHttpServer(0, "127.0.0.1", { publicMode: true })).rejects.toThrow(
      /GHOST_URL/,
    );
  });

  it("rejects when GHOST_CONTENT_KEY is missing", async () => {
    process.env.GHOST_URL = "https://x.ghost.io";
    await expect(startHttpServer(0, "127.0.0.1", { publicMode: true })).rejects.toThrow(
      /GHOST_CONTENT_KEY/,
    );
  });
});

describe("startHttpServer — dual mode env validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GHOST_URL;
    delete process.env.GHOST_CONTENT_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects when GHOST_URL is missing", async () => {
    await expect(startHttpServer(0, "127.0.0.1", { dualMode: true })).rejects.toThrow(/GHOST_URL/);
  });

  it("rejects when GHOST_CONTENT_KEY is missing", async () => {
    process.env.GHOST_URL = "https://x.ghost.io";
    await expect(startHttpServer(0, "127.0.0.1", { dualMode: true })).rejects.toThrow(
      /GHOST_CONTENT_KEY/,
    );
  });
});
