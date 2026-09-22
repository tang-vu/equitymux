import assert from "node:assert/strict";
import test from "node:test";
import { requestEquityAnalysis } from "../dist/equitymuxWork.js";

test("new intents use the decision engine without an execution tool", async () => {
  const output = {
    kind: "EXPOSURE_DECISION",
    decision: { execution: { status: "NOT_EXECUTED" } },
  };
  const result = await requestEquityAnalysis(
    { text: "Buy $10 of NVDA", mode: "recorded" },
    undefined,
    async (_url, init) => {
      assert.equal(JSON.parse(init.body).kind, "ANALYZE_EXPOSURE");
      return Response.json({ status: "SUCCEEDED", output });
    },
  );
  assert.deepEqual(result.output, output);
});

test("failed domain tasks cannot become paid deliverables", async () => {
  await assert.rejects(
    requestEquityAnalysis({ ticker: "NVDA" }, undefined, async () =>
      Response.json({
        status: "FAILED",
        output: { error: "missing evidence" },
      }),
    ),
    /did not succeed/,
  );
});

test("upstream failures stop delivery", async () => {
  await assert.rejects(
    requestEquityAnalysis(
      {},
      undefined,
      async () => new Response("unavailable", { status: 503 }),
    ),
    /api 503/,
  );
});
