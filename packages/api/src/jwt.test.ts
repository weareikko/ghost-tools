import { describe, expect, it } from "vitest";

import { signAdminJwt } from "./jwt.ts";

describe("signAdminJwt", () => {
  it("produces a JWT with three dot-separated segments", () => {
    const token = signAdminJwt("1234567890abcdef:deadbeef", { now: 1_700_000_000 });
    expect(token.split(".")).toHaveLength(3);
  });

  it("embeds kid, alg=HS256, aud=/admin/, and exp within 5 min of iat", () => {
    const now = 1_700_000_000;
    const token = signAdminJwt("myid:cafebabe", { now });
    const [headerSeg, payloadSeg] = token.split(".");

    const decode = (seg: string) =>
      JSON.parse(
        Buffer.from(seg.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf-8"),
      );

    const header = decode(headerSeg);
    const payload = decode(payloadSeg);

    expect(header).toMatchObject({ alg: "HS256", typ: "JWT", kid: "myid" });
    expect(payload.aud).toBe("/admin/");
    expect(payload.iat).toBe(now);
    expect(payload.exp).toBe(now + 300);
  });

  it("caps expiresInSeconds at 5 minutes (Ghost spec)", () => {
    const now = 1_700_000_000;
    const token = signAdminJwt("id:1234", { now, expiresInSeconds: 3600 });
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/"), "base64").toString(
        "utf-8",
      ),
    );
    expect(payload.exp - payload.iat).toBe(300);
  });

  it("rejects tokens without a colon", () => {
    expect(() => signAdminJwt("badtoken")).toThrow(/id:hexSecret/);
  });

  it("rejects tokens with non-hex secret", () => {
    expect(() => signAdminJwt("id:not-hex-here")).toThrow(/hex string/);
  });

  it("rejects tokens with odd-length hex secret", () => {
    expect(() => signAdminJwt("id:abc")).toThrow(/even-length/);
  });
});
