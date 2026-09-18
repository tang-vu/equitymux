export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, body?.detail ?? r.statusText);
  return body as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- types mirroring the backend ----------
export type MarketState = "REGULAR" | "EXTENDED" | "CLOSED" | "HALTED" | "UNKNOWN";

export interface Representation {
  underlying_ticker: string;
  underlying_name: string | null;
  platform: "ondo" | "xstocks" | "bstock";
  chain_id: number;
  token_address: string;
  token_symbol: string;
  decimals: number;
  shares_per_token: string;
  token_price_usd: string | null;
  reference_price_usd: string | null;
  reference_price_source?: string | null;
  market_state: MarketState;
  market_reason_code: string | null;
  market_reason_msg: string | null;
  next_open_time: number | null;
  next_close_time: number | null;
  attestation: { supported: boolean; daily_url: string | null; monthly_url: string | null };
  liquidity: {
    volume_24h_buy_usd: string | null;
    volume_24h_sell_usd: string | null;
    holders: number | null;
    market_cap_usd: string | null;
  };
  source_evidence: string[];
}

export interface RuleResult {
  rule: string;
  status: "PASS" | "FAIL" | "REQUIRES_CONFIRMATION" | "SKIP";
  detail: string;
}

export interface Candidate {
  representation: Representation;
  quote: { from_symbol: string; to_symbol: string; from_amount: string; to_amount: string; slippage_bps: number | null } | null;
  premium_bps: string | null;
  expected_slippage_bps: string | null;
  reference_age_s: number | null;
  status: "ELIGIBLE" | "REJECTED" | "REQUIRES_CONFIRMATION" | "SIMULATION_FAILED" | "STALE_REFERENCE" | "NO_QUOTE";
  reason_codes: string[];
  score: string | null;
  score_breakdown: Record<string, string>;
  policy: { eligible: boolean; requires_confirmation: boolean; results: RuleResult[] } | null;
  simulation: { status: string; detail: string } | null;
}

export interface ExploreResult {
  ticker: string;
  market: Record<string, unknown> & { marketStatus?: string; openState?: boolean; nextOpenTime?: number };
  representations: Representation[];
}

export interface RunResult {
  state: string;
  receipt: Receipt;
  candidates?: Candidate[];
  selected?: Candidate;
}

export interface Receipt {
  receiptId: string;
  receiptHash: string;
  state: string;
  createdAt: string;
  /** LIVE | RECORDED — provenance is part of the hashed body */
  dataLabel?: string;
  intent: { raw: string; ticker: string; side: string; notional: string; quote_asset: string };
  policy: { constitutionHash: string; checks: RuleResult[] };
  marketContext: Record<string, unknown>;
  candidates: Candidate[];
  selectedRoute: Candidate | null;
  simulation: Record<string, unknown> | null;
  authorization: Record<string, unknown>;
  execution: Record<string, unknown>;
  transitions: { state: string; at: string; note?: string }[];
}

export interface Health {
  app: string;
  service?: string;
  version?: string;
  demoMode: boolean;
  executionEnabled: boolean;
  bscRpc?: { ok: boolean; chainId?: number; block?: number };
  agenticWallet?: { installed: boolean; status?: string };
  binanceRwa?: { ok: boolean; marketStatus?: string };
}

export interface AgentTaskRow {
  task_id: string;
  kind: string;
  status: string;
  created_at: string;
  output_json?: string | null;
}

export interface AgentIdentity {
  agent: {
    name?: string;
    erc8004?: string | null;
    network?: string;
    endpoint?: string;
    status?: string;
    note?: string;
  };
  tasks: AgentTaskRow[];
}

export interface X402Info {
  x402: {
    surface: string;
    challenge: string;
    settlement: string;
    payToConfigured: boolean;
    bawSupport: string;
  };
}

export interface TaskResult {
  taskId: string;
  status: "SUCCEEDED" | "FAILED";
  output: Record<string, unknown>;
}

export interface ConstitutionRevision {
  hash: string;
  revision: number;
  active: number;
  nl_text: string;
  canonical?: Record<string, unknown>;
  compiler_version?: string;
  approved_at?: string | null;
  created_at: string;
}

export interface CompiledConstitution {
  compilerVersion: string;
  constitution: Record<string, unknown>;
  matchedRules: string[];
  uncompiledSentences: string[];
}

export interface DxEvent {
  timestamp: string;
  sessionId: string;
  module: string;
  endpoint: string;
  operation: string;
  method: string;
  httpStatus: number | null;
  businessCode?: string | null;
  success?: boolean;
  latencyMs?: number | null;
  errorClass?: string | null;
  errorMessage?: string | null;
  docsSection?: string | null;
  requestShape?: string | null;
  retryCount?: number | null;
  notes?: string | null;
}

export interface ReceiptRow {
  receipt_id: string;
  receipt_hash: string;
  state: string;
  created_at: string;
  data_label?: string | null;
}

export interface Config {
  demoMode: boolean;
  executionEnabled: boolean;
  requireSimulation: boolean;
  requireConfirmation: boolean;
  maxMainnetNotionalUsd: string;
  allowedPlatforms: string[];
  allowedQuoteAssets: string[];
  maxSlippageBpsHard: number;
  maxPremiumBpsHard: number;
}
