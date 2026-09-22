import type { RuleResult } from "./api";

export interface DecisionPolicy {
  max_premium_bps: string;
  max_parity_deviation_bps: string;
  max_slippage_bps: string;
  min_liquidity_usd: string;
  allowed_platforms: string[];
  require_attestation: boolean;
  allow_closed_market: boolean;
}
export const DEFAULT_POLICY: DecisionPolicy = {
  max_premium_bps: "100",
  max_parity_deviation_bps: "500",
  max_slippage_bps: "50",
  min_liquidity_usd: "0",
  allowed_platforms: ["ondo", "xstocks", "bstock"],
  require_attestation: false,
  allow_closed_market: true,
};
export interface DecisionRoute {
  platform: string;
  symbol: string;
  tokenAddress: string;
  tokenPriceUsd: string | null;
  sharesPerToken: string;
  sharePriceUsd: string | null;
  referencePriceUsd: string | null;
  referenceSource: string | null;
  premiumBps: string | null;
  marketState: string;
  indicativeShares: string | null;
  volume24hUsd: string | null;
  executableLiquidityUsd: null;
  allInCostUsd: null;
  status: "SHORTLISTED" | "REJECTED";
  checks: RuleResult[];
  blockers: string[];
  sourceEvidence: string[];
  attestation: {
    supported: boolean;
    daily_url: string | null;
    monthly_url: string | null;
  };
}
export interface DecisionReceipt {
  version: string;
  kind: string;
  dataLabel: "LIVE" | "RECORDED";
  receiptHash: string;
  snapshot: {
    ticker: string;
    source_digest: string | null;
    representations: unknown[];
  };
  intent: {
    ticker: string;
    raw: string;
    notional: string;
    quote_asset: string;
  };
  policy: DecisionPolicy;
  decision: {
    state: string;
    selected: string | null;
    explanation: string;
    dispersionBps: string | null;
    comparison: { against: string; displayedPriceAdvantageBps: string } | null;
    routes: DecisionRoute[];
    limitations: string[];
    execution: { status: string; txHash: null; blockers: string[] };
  };
}
export interface PolicyComparison {
  receipt: DecisionReceipt;
  previousHash: string;
  sameSnapshot: boolean;
  changes: {
    symbol: string;
    before: string;
    after: string;
    blockers: string[];
  }[];
}
export function formatNumber(
  value: string | null | undefined,
  digits = 2,
): string {
  if (value == null || !Number.isFinite(Number(value))) return "Unknown";
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatUsd(
  value: string | null | undefined,
  digits = 2,
): string {
  const formatted = formatNumber(value, digits);
  return formatted === "Unknown" ? formatted : "$" + formatted;
}
