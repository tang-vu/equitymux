import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PipelineStages } from "./PipelineStages";

const t = (state: string) => ({ state, at: "2026-01-01T00:00:00Z", detail: "" });

describe("PipelineStages", () => {
  it("renders every stage of a full happy-path run", () => {
    const transitions = [
      "INTENT_RECEIVED", "INTENT_COMPILED", "DISCOVERING", "QUOTING",
      "POLICY_EVALUATION", "SIMULATING", "READY", "EXECUTING",
      "PENDING_CONFIRMATION", "CONFIRMED",
    ].map(t);
    const html = renderToStaticMarkup(
      <PipelineStages transitions={transitions} state="CONFIRMED" />,
    );
    for (const label of [
      "Intent", "Compiled", "Representations", "Quotes", "Policy",
      "Simulation", "Ready", "Execution", "On-chain", "Confirmed",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("CONFIRMED");
    expect(html).toContain("10 transitions recorded");
  });

  it("marks terminal reject states as failed", () => {
    const html = renderToStaticMarkup(
      <PipelineStages
        transitions={["INTENT_RECEIVED", "DISCOVERING", "QUOTING"].map(t)}
        state="NO_VALID_ROUTE"
      />,
    );
    expect(html).toContain("chip-fail");
    expect(html).toContain("NO_VALID_ROUTE");
  });

  it("renders READY and PENDING_CONFIRMATION in the stage rail", () => {
    // Regression: both states were labeled but absent from the rail order.
    const html = renderToStaticMarkup(
      <PipelineStages transitions={[t("READY"), t("PENDING_CONFIRMATION")]} state="READY" />,
    );
    expect(html).toContain(">Ready<");
    expect(html).toContain(">On-chain<");
  });
});
