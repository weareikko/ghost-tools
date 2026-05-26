import { describe, expect, it } from "vitest";

import { createAuthToken, parseAuthHeader } from "./auth.ts";

describe("parseAuthHeader", () => {
  it("returns null for missing or non-Bearer headers", () => {
    expect(parseAuthHeader(undefined)).toBeNull();
    expect(parseAuthHeader("Basic xxx")).toBeNull();
  });

  it("parses base64url(JSON) format", () => {
    const token = createAuthToken({
      ghostUrl: "https://x.ghost.io",
      staffAccessToken: "myid:cafebabe",
      contentApiKey: "abc123",
    });
    const result = parseAuthHeader(`Bearer ${token}`);
    expect(result).toEqual({
      ghostUrl: "https://x.ghost.io",
      staffAccessToken: "myid:cafebabe",
      contentApiKey: "abc123",
    });
  });

  it("parses content-only credentials", () => {
    const token = createAuthToken({
      ghostUrl: "https://x.ghost.io",
      contentApiKey: "abc123",
    });
    const result = parseAuthHeader(`Bearer ${token}`);
    expect(result).toEqual({
      ghostUrl: "https://x.ghost.io",
      contentApiKey: "abc123",
    });
  });

  it("parses URL-encoded bearer tokens", () => {
    const token = createAuthToken({
      ghostUrl: "https://x.ghost.io",
      staffAccessToken: "myid:cafebabe",
    });
    const result = parseAuthHeader(`Bearer ${encodeURIComponent(token)}`);
    expect(result).toEqual({
      ghostUrl: "https://x.ghost.io",
      staffAccessToken: "myid:cafebabe",
    });
  });

  it("supports Ghost URLs with ports", () => {
    const token = createAuthToken({
      ghostUrl: "http://localhost:2368",
      staffAccessToken: "myid:cafebabe",
    });
    const result = parseAuthHeader(`Bearer ${token}`);
    expect(result).toEqual({
      ghostUrl: "http://localhost:2368",
      staffAccessToken: "myid:cafebabe",
    });
  });

  it("returns null for malformed payloads", () => {
    const bad = Buffer.from("not-json").toString("base64url");
    expect(parseAuthHeader(`Bearer ${bad}`)).toBeNull();
  });
});

describe("createAuthToken", () => {
  it("refuses to create a token without any credential", () => {
    expect(() => createAuthToken({ ghostUrl: "https://x.ghost.io" })).toThrow(
      /staffAccessToken or contentApiKey/,
    );
  });
});
