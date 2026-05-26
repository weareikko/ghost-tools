import { describe, expect, it } from "vitest";

import { executeToolWithCredentials } from "./handlers.ts";

const ADMIN_CREDS = {
  ghostUrl: "https://x.ghost.io",
  staffAccessToken: "id:cafebabe",
};

const PUBLIC_CREDS = {
  ghostUrl: "https://x.ghost.io",
  contentApiKey: "abc123def456abc123def456ab",
};

describe("executeToolWithCredentials", () => {
  it("rejects calls missing resource or action", async () => {
    const r = await executeToolWithCredentials("ghost", {}, ADMIN_CREDS);
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/resource.*action/);
  });

  it("rejects write actions on the read tool", async () => {
    const r = await executeToolWithCredentials(
      "ghost",
      { resource: "posts", action: "delete", id: "x" },
      ADMIN_CREDS,
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/write operation/);
  });

  it("rejects read actions on the write tool", async () => {
    const r = await executeToolWithCredentials(
      "ghost_write",
      { resource: "posts", action: "browse" },
      ADMIN_CREDS,
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/read operation/);
  });

  it("serves help without an API call", async () => {
    const r = await executeToolWithCredentials(
      "ghost",
      { resource: "posts", action: "help" },
      ADMIN_CREDS,
    );
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toMatch(/posts/);
  });

  it("rejects unknown resource", async () => {
    const r = await executeToolWithCredentials(
      "ghost",
      { resource: "spaceships", action: "browse" },
      ADMIN_CREDS,
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/Unknown resource/);
  });
});

describe("executeToolWithCredentials (public mode)", () => {
  it("blocks admin-only resources with a clear error", async () => {
    for (const resource of ["members", "newsletters", "users", "settings", "webhooks"]) {
      const r = await executeToolWithCredentials(
        "ghost",
        { resource, action: "browse" },
        PUBLIC_CREDS,
        true,
      );
      expect(r.isError, `expected ${resource} to be blocked in public mode`).toBe(true);
      expect(r.content[0].text).toMatch(/admin-only/);
    }
  });

  it("serves help for content resources without an API call", async () => {
    for (const resource of ["posts", "pages", "tags", "tiers", "authors"]) {
      const r = await executeToolWithCredentials(
        "ghost",
        { resource, action: "help" },
        PUBLIC_CREDS,
        true,
      );
      expect(r.isError, `help for ${resource} should succeed`).toBeUndefined();
      expect(r.content[0].text).toMatch(new RegExp(resource));
    }
  });

  it("blocks write actions on content resources", async () => {
    const r = await executeToolWithCredentials(
      "ghost",
      { resource: "posts", action: "add" },
      PUBLIC_CREDS,
      true,
    );
    expect(r.isError).toBe(true);
    // write action on the ghost (read) tool is blocked before publicMode is checked
    expect(r.content[0].text).toMatch(/write operation/);
  });

  it("blocks non-browse/read actions on content resources in public mode", async () => {
    // Simulate ghost_write being called in public mode at the handler level
    // (the HTTP layer prevents this by not registering ghost_write, but test the handler)
    const r = await executeToolWithCredentials(
      "ghost_write",
      { resource: "posts", action: "add" },
      PUBLIC_CREDS,
      true,
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/not available via the Content API/);
  });

  it("blocks unknown resources in public mode", async () => {
    const r = await executeToolWithCredentials(
      "ghost",
      { resource: "spaceships", action: "browse" },
      PUBLIC_CREDS,
      true,
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/admin-only/);
  });
});
