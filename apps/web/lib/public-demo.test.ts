import { describe, expect, it } from "vitest";
import { publicDemoAllows } from "./public-demo";

describe("public demo boundary", () => {
  it("preserves the stateless judge loop", () => {
    for (const route of [
      "decisions",
      "decisions/compare",
      "decisions/replay",
      "constitution/compile",
    ]) {
      expect(publicDemoAllows("POST", route.split("/"))).toBe(true);
    }
    expect(publicDemoAllows("GET", ["explore", "NVDA"])).toBe(true);
  });
  it("denies shared writes and diagnostics", () => {
    for (const route of [
      "intent",
      "constitution/approve",
      "agent/tasks",
      "agent/tasks/paid",
    ]) {
      expect(publicDemoAllows("POST", route.split("/"))).toBe(false);
    }
    expect(publicDemoAllows("GET", ["dx", "events"])).toBe(false);
    expect(publicDemoAllows("DELETE", ["receipts"])).toBe(false);
  });
  it("denies traversal and encoded path separators", () => {
    for (const part of [
      "..",
      "%2e%2e",
      "NVDA/../../dx/events",
      "%2f",
      "NVDA?x=1",
    ]) {
      expect(publicDemoAllows("GET", ["explore", part])).toBe(false);
    }
  });
});
