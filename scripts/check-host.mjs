import assert from "node:assert/strict";

const base = process.argv[2] || "http://127.0.0.1:3017";
async function request(route, body) {
  return fetch(base + route, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
}
const health = await (await request("/api/health")).json();
assert.equal(health.service, "equitymux-api");
assert.equal(health.demoMode, true);
assert.equal(health.executionEnabled, false);
const response = await request("/api/decisions", {
  text: "Buy $10 of NVDA",
  mode: "recorded",
});
assert.equal(response.status, 200);
const receipt = await response.json();
assert.equal(receipt.dataLabel, "RECORDED");
const replay = await (
  await request("/api/decisions/replay", { receipt })
).json();
assert.equal(replay.hashMatch, true);
assert.equal(replay.decisionMatch, true);
assert.equal(replay.provenanceMatch, true);
for (const route of [
  "/api/constitution/approve",
  "/api/intent",
  "/api/agent/tasks",
]) {
  assert.equal((await request(route, {})).status, 403, route);
}
assert.equal((await request("/api/dx/events")).status, 403);
const html = await (await request("/")).text();
assert.ok(html.includes("Understand every wrapper."));
console.log(
  JSON.stringify({
    origin: base,
    service: health.service,
    recordedDecision: "PASS",
    replay: "PASS",
    publicWriteBoundary: "PASS",
    homepage: "PASS",
  }),
);
