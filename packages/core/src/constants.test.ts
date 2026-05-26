import { describe, expect, it } from "vitest";

import { isReadAction, isWriteAction, READ_ACTIONS, WRITE_ACTIONS } from "./constants.ts";

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
