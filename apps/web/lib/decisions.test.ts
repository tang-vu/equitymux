import { describe, expect, it } from "vitest";
import { formatNumber } from "./decisions";

describe("market evidence display", () => {
  it("keeps unknown prices distinct from zero", () => {
    expect(formatNumber(null)).toBe("Unknown");
    expect(formatNumber("NaN")).toBe("Unknown");
    expect(formatNumber("0")).toBe("0.00");
  });
});
