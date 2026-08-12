import { describe, expect, it } from "vitest";
import { getTokenExpiryMs } from "../../src/auth/tokenUtils";

const buildToken = (payload: Record<string, unknown>): string => {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${encoded}.signature`;
};

describe("getTokenExpiryMs", () => {
  it("returns the exp claim converted to milliseconds", () => {
    expect(getTokenExpiryMs(buildToken({ exp: 1754919000 }))).toBe(1754919000000);
  });

  it("decodes a standard base64 payload with padding", () => {
    const token = `header.${btoa(JSON.stringify({ exp: 1754919000 }))}.signature`;
    expect(getTokenExpiryMs(token)).toBe(1754919000000);
  });

  it("decodes a base64url payload with url-safe characters and no padding", () => {
    // "~~~" encodes to bytes that produce + and / in standard base64.
    const token = buildToken({ exp: 1754919000, note: "~~~þÿ" });
    expect(getTokenExpiryMs(token)).toBe(1754919000000);
  });

  it.each([
    ["empty string", ""],
    ["not a JWT at all", "not-a-jwt"],
    ["two segments", "header.payload"],
    ["four segments", "a.b.c.d"],
    ["invalid base64 payload", "header.###.signature"],
    ["payload that is not JSON", `header.${btoa("not json")}.signature`],
    ["payload without exp", buildToken({ sub: "1", role: "viewer" })],
    ["non-numeric exp", buildToken({ exp: "soon" })],
    ["null exp", buildToken({ exp: null })],
  ])("returns null for %s", (_label, token) => {
    expect(getTokenExpiryMs(token)).toBeNull();
  });
});
