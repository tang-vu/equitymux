"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  LockKeyhole,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "@/lib/api";
import { DecisionRecord } from "@/components/DecisionRecord";
import { NormalizationScene } from "@/components/NormalizationScene";
import { ParityMap } from "@/components/ParityMap";
import { ProviderLedger } from "@/components/ProviderLedger";
import { verifyReceiptHash } from "@/lib/canonical";
import {
  DEFAULT_POLICY,
  formatNumber as fmt,
  formatUsd as usd,
  type DecisionPolicy,
  type DecisionReceipt,
  type PolicyComparison,
} from "@/lib/decisions";

const ISSUERS: Record<string, string> = {
  ondo: "Ondo",
  xstocks: "xStocks",
  bstock: "bStocks",
};
const COMPANIES: Record<string, string> = {
  NVDA: "NVIDIA",
  AAPL: "Apple",
  TSLA: "Tesla",
};
const INITIAL_INTENT = "Buy $10 of NVDA";
type Mode = "recorded" | "live";

function requestDecision(
  text: string,
  mode: Mode,
  policy: DecisionPolicy,
  signal?: AbortSignal,
) {
  return api<DecisionReceipt>("/decisions", {
    method: "POST",
    body: JSON.stringify({ text, mode, policy }),
    signal,
  });
}

export default function DecisionDesk() {
  const [text, setText] = useState(INITIAL_INTENT);
  const [mode, setMode] = useState<Mode>("recorded");
  const [policy, setPolicy] = useState<DecisionPolicy>(DEFAULT_POLICY);
  const [baseline, setBaseline] = useState<DecisionPolicy>(DEFAULT_POLICY);
  const [receipt, setReceipt] = useState<DecisionReceipt | null>(null);
  const [comparison, setComparison] = useState<PolicyComparison | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [proof, setProof] = useState("");
  const [inspected, setInspected] = useState<string | null>(null);
  const [challengeActive, setChallengeActive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    requestDecision(
      INITIAL_INTENT,
      "recorded",
      DEFAULT_POLICY,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setReceipt(result);
        setPolicy(result.policy);
        setBaseline(result.policy);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, []);

  async function run(nextText = text) {
    setBusy(true);
    setError("");
    setProof("");
    try {
      const next = await requestDecision(nextText, mode, policy);
      setReceipt(next);
      setInspected(null);
      setChallengeActive(false);
      setPolicy(next.policy);
      setBaseline(next.policy);
      setComparison(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function compare(
    nextPolicy: DecisionPolicy,
    kind: "apply" | "challenge" | "restore" = "apply",
  ) {
    if (!receipt) return;
    setBusy(true);
    setError("");
    setProof("");
    try {
      const next = await api<PolicyComparison>("/decisions/compare", {
        method: "POST",
        body: JSON.stringify({ receipt, policy: nextPolicy }),
      });
      if (kind === "challenge" && !challengeActive) setBaseline(receipt.policy);
      if (kind === "apply") setBaseline(next.receipt.policy);
      setChallengeActive(kind === "challenge");
      setComparison(next);
      setReceipt(next.receipt);
      setPolicy(next.receipt.policy);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!receipt) return;
    setBusy(true);
    setError("");
    setProof("PENDING · Browser integrity and server replay incomplete");
    try {
      const local = await verifyReceiptHash(
        receipt as unknown as Record<string, unknown>,
      );
      setProof(
        (local.ok && local.match
          ? "Browser SHA-256 MATCH"
          : "Browser SHA-256 MISMATCH") +
          " · Decision replay pending · Provenance pending",
      );
      const result = await api<{
        hashMatch: boolean;
        decisionMatch: boolean;
        provenanceMatch: boolean;
      }>("/decisions/replay", {
        method: "POST",
        body: JSON.stringify({ receipt }),
      });
      setProof(
        local.ok &&
          local.match &&
          result.hashMatch &&
          result.decisionMatch &&
          result.provenanceMatch
          ? "MATCH · Browser SHA-256 + decision replay + source-label consistency"
          : "MISMATCH · Receipt verification failed",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!receipt) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(receipt, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "equitymux-" + receipt.intent.ticker + "-decision.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function selectSample(ticker: string) {
    const intent = "Buy $10 of " + ticker;
    setText(intent);
    void run(intent);
  }

  const decision = receipt?.decision;
  const selected = decision?.routes.find(
    (r) => r.tokenAddress === decision.selected,
  );
  const dirty =
    receipt && JSON.stringify(policy) !== JSON.stringify(receipt.policy);
  const ticker = receipt?.intent.ticker ?? "NVDA";
  const passing =
    decision?.routes.filter((r) => r.status === "SHORTLISTED").length ?? 0;

  return (
    <div className="exposure-desk">
      <div className="desk-masthead">
        <div>
          <p className="label masthead-kicker">
            EQUITY RESEARCH / BNB SMART CHAIN
          </p>
          <h1>
            One company.
            <br />
            <span>Understand every wrapper.</span>
          </h1>
        </div>
        <p className="masthead-note">
          Different units. A common basis.
          <br />
          Compare the exposure. Keep the evidence.
        </p>
      </div>

      <section className="intent-station" aria-label="Exposure intent">
        <div className="intent-topline">
          <label htmlFor="intent" className="label">
            YOUR RESEARCH INTENT
          </label>
          <label className="source-control">
            <span>Source</span>
            <select
              aria-label="Data source"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              disabled={busy}
            >
              <option value="recorded">Recorded snapshot</option>
              <option value="live">Live Binance data</option>
            </select>
          </label>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <span className="intent-prompt" aria-hidden="true">
            ↳
          </span>
          <input
            id="intent"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            disabled={busy}
            aria-describedby="intent-hint"
          />
          <button className="primary-action" disabled={busy || !text.trim()}>
            Compare exposure <ArrowRight size={16} />
          </button>
        </form>
        <div className="intent-bottomline">
          <div className="sample-assets">
            <span>Explore</span>
            {Object.entries(COMPANIES).map(([symbol, name]) => (
              <button
                key={symbol}
                onClick={() => selectSample(symbol)}
                disabled={busy}
                className={ticker === symbol ? "sample-active" : ""}
                aria-label={"Explore " + name}
              >
                {symbol}
              </button>
            ))}
          </div>
          <p id="intent-hint">
            Spot equity analysis. Your wallet stays untouched.
          </p>
        </div>
      </section>

      {error && (
        <div role="alert" className="desk-error">
          <strong>We couldn’t complete that request.</strong>
          <p>{error}</p>
          {receipt && <p>The previous snapshot is still shown below.</p>}
        </div>
      )}
      {!receipt ? (
        <div className="desk-loading" role="status">
          <span className="loading-rule" />
          <p>
            {busy
              ? "Opening the recorded NVIDIA snapshot…"
              : "Enter an intent to open the research desk."}
          </p>
          <span>
            Compare issuer economics, inspect policy checks, and replay the
            result.
          </span>
        </div>
      ) : (
        <>
          <a className="mobile-verdict-link" href="#research-verdict">
            <span>
              {selected
                ? selected.symbol + " leads the shortlist"
                : "No qualifying route"}
            </span>
            <span>
              {passing}/{decision!.routes.length} pass · Research only ↓
            </span>
          </a>
          <section className="asset-heading" aria-label="Current exposure">
            <div className="asset-identity">
              <span className="asset-monogram" aria-hidden="true">
                {ticker.slice(0, 1)}
              </span>
              <div>
                <p className="label">{ticker} / TOKENIZED EQUITY</p>
                <h2>{COMPANIES[ticker] ?? ticker}</h2>
              </div>
            </div>
            <div className="asset-stat">
              <span className="label">TARGET EXPOSURE</span>
              <strong>
                {usd(receipt.intent.notional)}
                <small>{receipt.intent.quote_asset}</small>
              </strong>
            </div>
            <div className="asset-stat">
              <span className="label">ISSUER COVERAGE</span>
              <strong>
                {decision!.routes.length}
                <small>representations</small>
              </strong>
            </div>
            <div className="snapshot-caption">
              <span
                className={
                  "source-stamp " +
                  (receipt.dataLabel === "LIVE" ? "source-live" : "")
                }
              >
                <i />
                {receipt.dataLabel} · ANALYSIS ONLY
              </span>
              <span>
                {busy
                  ? "Request pending · previous evidence shown"
                  : "Prices are observations, not quotes."}
              </span>
            </div>
          </section>

          <div className="instrument-layout">
            <NormalizationScene
              receipt={receipt}
              inspected={inspected ?? decision!.selected}
              onInspect={setInspected}
            />
            <section
              id="research-verdict"
              className={
                "decision-verdict decision-memo " +
                (selected ? "memo-ready" : "memo-stop")
              }
              aria-live="polite"
            >
              <div className="memo-topline">
                <span className="label">THE RESEARCH VERDICT</span>
                <span className="memo-count">
                  {passing}/{decision!.routes.length} pass
                </span>
              </div>
              {selected ? (
                <>
                  <h3>{selected.symbol}</h3>
                  <p className="memo-subtitle">leads the research shortlist</p>
                  <div className="memo-price">
                    {usd(selected.sharePriceUsd)}
                    <span>/ underlying share</span>
                  </div>
                </>
              ) : (
                <>
                  <h3>
                    No qualifying
                    <br />
                    route.
                  </h3>
                  <p className="memo-subtitle">
                    The right decision is to stop.
                  </p>
                </>
              )}
              <p className="memo-state">{decision!.state}</p>
              {!selected && (
                <p className="decisive-reason">
                  {Array.from(
                    new Set(
                      decision!.routes.flatMap((r) =>
                        r.checks
                          .filter((c) => c.status === "FAIL")
                          .map((c) => c.detail),
                      ),
                    ),
                  ).join(" · ")}
                </p>
              )}
              <p className="memo-explanation">{decision!.explanation}</p>
              <div className="memo-boundary">
                <LockKeyhole size={14} />
                <span>Research only. Execution is locked.</span>
              </div>
            </section>
          </div>
          <div
            className={"research-layout" + (busy ? " research-busy" : "")}
            aria-busy={busy}
          >
            <section className="market-research" aria-label="Market comparison">
              <ProviderLedger
                inspected={inspected}
                onInspect={setInspected}
                routes={decision!.routes}
                selected={decision!.selected}
              />
              <ParityMap
                inspected={inspected}
                onInspect={setInspected}
                routes={decision!.routes}
                dispersion={decision!.dispersionBps}
              />
              <section className="policy-experiment">
                <div className="experiment-index" aria-hidden="true">
                  ↗
                </div>
                <div>
                  <span className="label">TEST THE BOUNDARY</span>
                  <h3>What changes when your policy does?</h3>
                  <p>
                    Require $100,000 of executable liquidity. Keep this exact
                    market snapshot. Watch the decision change.
                  </p>
                  <button
                    className="text-action"
                    disabled={busy || challengeActive}
                    onClick={() =>
                      compare(
                        { ...receipt.policy, min_liquidity_usd: "100000" },
                        "challenge",
                      )
                    }
                  >
                    Require liquidity evidence <ArrowRight size={15} />
                  </button>
                </div>
                {comparison && (
                  <div className="comparison-result" aria-live="polite">
                    <strong>
                      {comparison.sameSnapshot
                        ? "Same snapshot. Only the policy changed."
                        : "Snapshot consistency not confirmed."}
                    </strong>
                    <div className="snapshot-invariant">
                      <span className="label">UNCHANGED EVIDENCE</span>
                      {decision!.routes.map((r) => (
                        <div key={r.tokenAddress}>
                          <span>{r.symbol}</span>
                          <span>{fmt(r.sharePriceUsd)} USD/share</span>
                          <span>Depth: Unknown</span>
                        </div>
                      ))}
                      <span className="label">CHANGED POLICY OUTCOMES</span>
                    </div>
                    {comparison.changes.length ? (
                      comparison.changes.map((c) => (
                        <p key={c.symbol}>
                          <span>{c.symbol}</span>
                          <span>
                            {c.before === "SHORTLISTED"
                              ? "Shortlisted"
                              : "Rejected"}{" "}
                            <ArrowRight size={12} />{" "}
                            {c.after === "SHORTLISTED"
                              ? "Shortlisted"
                              : "Rejected"}
                          </span>
                          {c.blockers.length > 0 && (
                            <small>{c.blockers.join(" · ")}</small>
                          )}
                        </p>
                      ))
                    ) : (
                      <p>No route status changed.</p>
                    )}
                    <button
                      className="text-action"
                      disabled={busy}
                      onClick={() => compare(baseline, "restore")}
                    >
                      Restore baseline policy <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </section>
            </section>

            <aside className="decision-column" aria-label="Decision and policy">
              <details className="policy-editor" id="risk-policy">
                <summary>
                  <SlidersHorizontal size={16} />
                  <span>
                    Risk policy
                    <small>
                      {receipt.policy.allowed_platforms.length} issuers ·{" "}
                      {receipt.policy.max_premium_bps} bps premium cap
                    </small>
                  </span>
                  <ChevronDown size={16} />
                </summary>
                <div className="policy-controls">
                  <p className="small-note">
                    Apply edits to the same snapshot to isolate their effect.
                  </p>
                  <fieldset disabled={busy}>
                    <NumberField
                      label="Maximum premium (bps)"
                      value={policy.max_premium_bps}
                      max={10000}
                      onChange={(v) =>
                        setPolicy({ ...policy, max_premium_bps: v })
                      }
                    />
                    <NumberField
                      label="Maximum absolute deviation (bps)"
                      value={policy.max_parity_deviation_bps}
                      max={10000}
                      onChange={(v) =>
                        setPolicy({ ...policy, max_parity_deviation_bps: v })
                      }
                    />
                    <NumberField
                      label="Slippage ceiling (bps)"
                      value={policy.max_slippage_bps}
                      max={100}
                      onChange={(v) =>
                        setPolicy({ ...policy, max_slippage_bps: v })
                      }
                    />
                    <NumberField
                      label="Minimum executable liquidity ($)"
                      value={policy.min_liquidity_usd}
                      max={1000000000}
                      onChange={(v) =>
                        setPolicy({ ...policy, min_liquidity_usd: v })
                      }
                    />
                    <fieldset className="issuer-options">
                      <legend>Allowed issuers</legend>
                      {Object.entries(ISSUERS).map(([key, label]) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={policy.allowed_platforms.includes(key)}
                            onChange={(e) =>
                              setPolicy({
                                ...policy,
                                allowed_platforms: e.target.checked
                                  ? [...policy.allowed_platforms, key]
                                  : policy.allowed_platforms.filter(
                                      (p) => p !== key,
                                    ),
                              })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <label className="policy-check">
                      <input
                        type="checkbox"
                        checked={policy.require_attestation}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            require_attestation: e.target.checked,
                          })
                        }
                      />
                      Require issuer report link
                    </label>
                    <label className="policy-check">
                      <input
                        type="checkbox"
                        checked={policy.allow_closed_market}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            allow_closed_market: e.target.checked,
                          })
                        }
                      />
                      Allow closed-market analysis
                    </label>
                  </fieldset>
                  <button
                    className="primary-action"
                    disabled={busy || !dirty}
                    onClick={() => compare(policy)}
                  >
                    Apply to same snapshot <ArrowRight size={14} />
                  </button>
                  {dirty && (
                    <p className="pending-policy">
                      Edits pending. The verdict still uses the policy in the
                      receipt.
                    </p>
                  )}
                  <p className="small-note">
                    Slippage needs a quote. Depth needs liquidity evidence.
                    Unknown values cannot satisfy a required limit.
                  </p>
                </div>
              </details>
              <div className="execution-note">
                <span className="label">BEFORE ANY TRADE</span>
                <p>
                  A research lead still needs a fresh quote, bound swap
                  simulation and human authorization.
                </p>
                <details>
                  <summary>
                    Inspect execution blockers <ChevronDown size={13} />
                  </summary>
                  <ul>
                    {decision!.execution.blockers.map((blocker) => (
                      <li key={blocker}>
                        {blocker.toLowerCase().replaceAll("_", " ")}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </aside>
          </div>

          <DecisionRecord
            receipt={receipt}
            busy={busy}
            proof={proof}
            verify={verify}
            download={download}
          />
          <details className="evidence-limits">
            <summary>
              How to read this evidence <ChevronDown size={14} />
            </summary>
            <ul>
              {decision!.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </details>
        </>
      )}
      <footer className="desk-footer">
        <span>
          EquityMux<span className="footer-slash">/</span>Clarity before
          capital.
        </span>
        <a href="/agent">
          Built for people. Open to agents. <ArrowUpRight size={13} />
        </a>
      </footer>
    </div>
  );
}

function NumberField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="policy-number">
      {label}
      <input
        type="number"
        min={0}
        max={max}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
