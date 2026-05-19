import { describe, expect, it } from "vitest";
import { buildGameFrameUrl, getRequestedGameRoute, normalizeGameHash } from "@/utils/shell";

describe("shell utils", () => {
  it("normalizes empty routes to auth", () => {
    expect(normalizeGameHash("")).toBe("#/auth");
    expect(normalizeGameHash(null)).toBe("#/auth");
  });

  it("normalizes raw routes into hash routes", () => {
    expect(normalizeGameHash("/battle")).toBe("#/battle");
    expect(normalizeGameHash("lobby")).toBe("#/lobby");
    expect(normalizeGameHash("#/rooms")).toBe("#/rooms");
  });

  it("reads requested route from search params", () => {
    expect(getRequestedGameRoute("?route=%2Fbattle")).toBe("/battle");
    expect(getRequestedGameRoute("?foo=1")).toBeNull();
  });

  it("builds iframe url with reload seed", () => {
    expect(buildGameFrameUrl("/battle", 3)).toBe("./game/index.html?shell=3#/battle");
  });
});
