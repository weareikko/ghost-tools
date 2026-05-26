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
