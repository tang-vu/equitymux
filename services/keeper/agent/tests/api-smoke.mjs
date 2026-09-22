import assert from "node:assert/strict";
import { requestEquityAnalysis } from "../dist/equitymuxWork.js";

// Run with the real API listening at EQUITYMUX_API_URL. No payment/signing code.
const result = await requestEquityAnalysis({
  text: "Buy $10 of NVDA",
  mode: "recorded",
});
assert.equal(result.status, "SUCCEEDED");
assert.equal(result.output.kind, "EXPOSURE_DECISION");
assert.equal(result.output.dataLabel, "RECORDED");
assert.equal(result.output.decision.routes.length, 3);
assert.equal(result.output.decision.execution.status, "NOT_EXECUTED");
assert.equal(result.output.decision.execution.txHash, null);
console.log(
  "PASS: keeper adapter -> real API -> RECORDED decision receipt; no execution",
);
