import { mockEvent } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  authorizeGetHandler,
  authorizePostHandler,
  createProtectedResourceHandler,
  createS256Challenge,
} from "./oauth.ts";

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

// ─── GHOST_URL_LOCK ──────────────────────────────────────────────────────────

/** Convenience: invoke a defineEventHandler-wrapped handler with an h3 event. */
function invokeHandler<T>(handler: unknown, event: unknown): Promise<T> {
  return (handler as (e: unknown) => Promise<T>)(event);
}

/** Minimal PKCE query params for GET /authorize. */
const PKCE_QUERY = new URLSearchParams({
  redirect_uri: "http://localhost:12345/callback",
  state: "test-state",
  code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  code_challenge_method: "S256",
}).toString();

describe("GHOST_URL_LOCK — GET /authorize", () => {
  beforeEach(() => {
    vi.stubEnv("GHOST_URL_LOCK", "https://locked.ghost.io");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("pre-fills the Ghost site URL field with the locked value", async () => {
    const event = mockEvent(`/authorize?${PKCE_QUERY}`);
    const html = await invokeHandler<string>(authorizeGetHandler, event);
    expect(html).toContain('value="https://locked.ghost.io"');
  });

  it("renders the URL input as readonly", async () => {
    const event = mockEvent(`/authorize?${PKCE_QUERY}`);
    const html = await invokeHandler<string>(authorizeGetHandler, event);
    // The ghostUrl input must have the readonly attribute (not just the CSS rule mention)
    expect(html).toMatch(/id="ghostUrl"[^>]* readonly/);
  });

  it("shows a lock notice mentioning the locked URL", async () => {
    const event = mockEvent(`/authorize?${PKCE_QUERY}`);
    const html = await invokeHandler<string>(authorizeGetHandler, event);
    expect(html).toContain('class="notice-lock"');
    expect(html).toContain("https://locked.ghost.io");
  });
});

describe("GHOST_URL_LOCK — GET /authorize (lock not set)", () => {
  beforeEach(() => {
    // Ensure GHOST_URL_LOCK is not set for these tests regardless of global env state
    vi.stubEnv("GHOST_URL_LOCK", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not show the lock notice when GHOST_URL_LOCK is not set", async () => {
    const event = mockEvent(`/authorize?${PKCE_QUERY}`);
    const html = await invokeHandler<string>(authorizeGetHandler, event);
    expect(html).not.toContain('class="notice-lock"');
    // The ghostUrl input must NOT have the readonly attribute (only the CSS rule mentions "readonly")
    expect(html).not.toMatch(/id="ghostUrl"[^>]* readonly/);
  });
});

describe("GHOST_URL_LOCK — POST /authorize (server-side enforcement)", () => {
  beforeEach(() => {
    vi.stubEnv("GHOST_URL_LOCK", "https://locked.ghost.io");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("succeeds using the locked URL even when ghostUrl is omitted from POST body", async () => {
    const body = new URLSearchParams({
      // ghostUrl intentionally omitted — lock must supply it
      staffAccessToken: "abc123:def4567890abcdef",
      redirectUri: "http://localhost:12345/callback",
      state: "test-state",
      codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      codeChallengeMethod: "S256",
    }).toString();
    const event = mockEvent("/authorize", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const html = await invokeHandler<string>(authorizePostHandler, event);
    // Should reach the success page, not an error form
    expect(html).toContain("Successfully Connected");
  });

  it("ignores a crafted ghostUrl in the POST body and uses the lock value instead", async () => {
    const body = new URLSearchParams({
      ghostUrl: "https://attacker.ghost.io", // should be silently replaced
      staffAccessToken: "abc123:def4567890abcdef",
      redirectUri: "http://localhost:12345/callback",
      state: "test-state",
      codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      codeChallengeMethod: "S256",
    }).toString();
    const event = mockEvent("/authorize", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const html = await invokeHandler<string>(authorizePostHandler, event);
    // Successful response — the lock URL was used, not the attacker URL
    expect(html).toContain("Successfully Connected");
    // The attacker URL must not appear in the success page redirect
    expect(html).not.toContain("attacker.ghost.io");
  });

  it("shows the lock notice when re-rendering the form on error", async () => {
    const body = new URLSearchParams({
      // No staffAccessToken → validation error → form re-rendered
      redirectUri: "http://localhost:12345/callback",
      state: "test-state",
      codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      codeChallengeMethod: "S256",
    }).toString();
    const event = mockEvent("/authorize", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const html = await invokeHandler<string>(authorizePostHandler, event);
    expect(html).toContain('class="notice-lock"');
    expect(html).toContain("https://locked.ghost.io");
  });
});
