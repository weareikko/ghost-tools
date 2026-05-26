import { describe, expect, it } from "vitest";

import { createProtectedResourceHandler, createS256Challenge } from "./oauth.ts";

describe("createS256Challenge", () => {
  it("produces a base64url-encoded SHA-256 digest", () => {
    // RFC 7636 test vector
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = createS256Challenge(verifier);
    // Must be base64url (no +, /, or =)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("different verifiers produce different challenges", () => {
    expect(createS256Challenge("abc")).not.toBe(createS256Challenge("def"));
  });
});

describe("createProtectedResourceHandler", () => {
  function callHandler(mcpPath?: string, host = "example.com") {
    const handler = mcpPath
      ? createProtectedResourceHandler(mcpPath)
      : createProtectedResourceHandler();

    // Minimal fake H3Event
    const event = {
      req: {
        headers: { get: (k: string) => (k === "host" ? host : null) },
      },
      res: {
        headers: { set: () => {} },
      },
    };

    // h3 defineEventHandler wraps the function — call the inner handler directly
    // by invoking the returned value (which is the defineEventHandler wrapper)
    return (handler as unknown as (e: unknown) => unknown)(event);
  }

  it("defaults to /mcp as the resource path", () => {
    const result = callHandler() as { resource: string };
    expect(result.resource).toBe("http://example.com/mcp");
  });

  it("uses the provided mcpPath", () => {
    const result = callHandler("/admin/mcp") as { resource: string };
    expect(result.resource).toBe("http://example.com/admin/mcp");
  });

  it("includes required OAuth metadata fields", () => {
    const result = callHandler() as Record<string, unknown>;
    expect(result).toHaveProperty("authorization_servers");
    expect(result).toHaveProperty("bearer_methods_supported");
    expect(result).toHaveProperty("scopes_supported");
  });
});
