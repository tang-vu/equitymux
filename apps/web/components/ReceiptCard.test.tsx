import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReceiptCard } from "./ReceiptCard";
import type { Receipt } from "@/lib/api";

describe("execution receipt provenance", () => {
  it("never labels missing provenance as live", () => {
    const receipt = {
      receiptId: "test-id",
      receiptHash: "0x123",
      state: "SIMULATION_FAILED",
      intent: { side: "BUY", notional: "10", ticker: "NVDA" },
      policy: { constitutionHash: "test-policy" },
      marketContext: {},
      execution: {},
    } as Receipt;
    const html = renderToStaticMarkup(<ReceiptCard receipt={receipt} />);
    expect(html).toContain("Unknown");
    expect(html).not.toContain(">LIVE<");
    expect(html).not.toContain(">MATCH<");
  });
});
