import { CONTENT_RESOURCES } from "@ikko-dev/ghost-core";
import { describe, expect, it } from "vitest";

import { getTools, STDIO_ONLY_TOOLS } from "./tools.ts";

describe("getTools", () => {
  it("returns both ghost and ghost_write by default", () => {
    const names = getTools().map((t) => t.name);
    expect(names).toContain("ghost");
    expect(names).toContain("ghost_write");
  });

  it("omits ghost_write in read-only mode", () => {
    const names = getTools({ readOnly: true }).map((t) => t.name);
    expect(names).toContain("ghost");
    expect(names).not.toContain("ghost_write");
  });

  it("ghost is annotated readOnlyHint=true, ghost_write destructiveHint=true", () => {
    const [read, write] = getTools();
    expect(read.annotations?.readOnlyHint).toBe(true);
    expect(write.annotations?.destructiveHint).toBe(true);
  });

  it("STDIO_ONLY_TOOLS contains ghost_configure + ghost_get_config", () => {
    const names = STDIO_ONLY_TOOLS.map((t) => t.name);
    expect(names).toEqual(["ghost_configure", "ghost_get_config"]);
  });
});

describe("getTools (public mode)", () => {
  it("returns only the ghost tool", () => {
    const tools = getTools({ publicMode: true });
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("ghost");
  });

  it("ghost_write is not included", () => {
    const names = getTools({ publicMode: true }).map((t) => t.name);
    expect(names).not.toContain("ghost_write");
  });

  it("resource enum is restricted to content resources", () => {
    const [tool] = getTools({ publicMode: true });
    const resourceEnum = (tool.inputSchema as { properties: { resource: { enum: string[] } } })
      .properties.resource.enum;
    expect(resourceEnum.toSorted()).toEqual([...CONTENT_RESOURCES].toSorted());
  });

  it("tool is annotated readOnlyHint=true and destructiveHint=false", () => {
    const [tool] = getTools({ publicMode: true });
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.annotations?.destructiveHint).toBe(false);
  });

  it("publicMode takes precedence over readOnly", () => {
    // readOnly + publicMode → public wins (only one tool, content-scoped)
    const tools = getTools({ publicMode: true, readOnly: true });
    expect(tools).toHaveLength(1);
  });
});
