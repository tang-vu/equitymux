/** Analysis-only domain adapter. Payment signing remains in SellerCore. */
export async function requestEquityAnalysis(
  input: Record<string, unknown>,
  abortSignal?: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const base = (
    process.env.EQUITYMUX_API_URL ?? "http://localhost:8000"
  ).replace(/\/+$/, "");
  const timeout = AbortSignal.timeout(120_000);
  const resp = await transport(`${base}/api/agent/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind:
        typeof input.text === "string"
          ? "ANALYZE_EXPOSURE"
          : "EVALUATE_EQUITY_INTENT",
      input,
    }),
    signal: abortSignal ? AbortSignal.any([abortSignal, timeout]) : timeout,
  });
  if (!resp.ok)
    throw new Error(`equitymux api ${resp.status}: ${await resp.text()}`);
  const analysis = (await resp.json()) as Record<string, unknown>;
  if (
    analysis.status !== "SUCCEEDED" ||
    !analysis.output ||
    typeof analysis.output !== "object"
  ) {
    throw new Error(
      "equitymux analysis did not succeed; no deliverable submitted",
    );
  }
  return analysis;
}
