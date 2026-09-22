import { describe, expect, it } from "vitest";
import { formatNumber, formatUsd } from "./decisions";

describe("market evidence display", () => {
  it("keeps unknown prices distinct from zero", () => {
    expect(formatNumber(null)).toBe("Unknown");
    expect(formatNumber("NaN")).toBe("Unknown");
    expect(formatNumber("0")).toBe("0.00");
    expect(formatUsd(null)).toBe("Unknown");
    expect(formatUsd("0")).toBe("$0.00");
  });
});
