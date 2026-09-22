"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Fingerprint,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { ParityMap } from "@/components/ParityMap";
import { verifyReceiptHash } from "@/lib/canonical";
import {
  DEFAULT_POLICY,
  formatNumber as fmt,
  type DecisionPolicy,
  type DecisionReceipt,
  type DecisionRoute,
  type PolicyComparison,
} from "@/lib/decisions";

const LABELS: Record<string, string> = {
  ondo: "Ondo",
  xstocks: "xStocks",
  bstock: "bStocks",
};

export default function DecisionDesk() {
  const [text, setText] = useState("Buy $10 of NVDA");
  const [mode, setMode] = useState<"recorded" | "live">("recorded");
  const [policy, setPolicy] = useState<DecisionPolicy>(DEFAULT_POLICY);
  const [receipt, setReceipt] = useState<DecisionReceipt | null>(null);
  const [comparison, setComparison] = useState<PolicyComparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [proof, setProof] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    setProof("");
    setComparison(null);
    setReceipt(null);
    try {
      const next = await api<DecisionReceipt>("/decisions", {
        method: "POST",
        body: JSON.stringify({ text, mode, policy }),
      });
      setReceipt(next);
      setPolicy(next.policy);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }
  async function compare(nextPolicy: DecisionPolicy) {
    if (!receipt) return;
    setBusy(true);
    setError("");
    setProof("");
    try {
      const next = await api<PolicyComparison>("/decisions/compare", {
        method: "POST",
        body: JSON.stringify({ receipt, policy: nextPolicy }),
      });
      setComparison(next);
      setReceipt(next.receipt);
      setPolicy(next.receipt.policy);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    if (!receipt) return;
    setBusy(true);
    setError("");
    try {
      const local = await verifyReceiptHash(
        receipt as unknown as Record<string, unknown>,
      );
      const replay = await api<{
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
          replay.hashMatch &&
          replay.decisionMatch &&
          replay.provenanceMatch
          ? "MATCH · Browser SHA-256 + decision replay + source-label consistency"
          : "MISMATCH · Receipt verification failed",
      );
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
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
    link.download = `equitymux-${receipt.intent.ticker}-decision.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const decision = receipt?.decision;
  const selected = decision?.routes.find(
    (r) => r.tokenAddress === decision.selected,
  );
  const dirty =
    receipt && JSON.stringify(policy) !== JSON.stringify(receipt.policy);

  return (
    <div className="desk space-y-7">
      <section className="desk-hero grid lg:grid-cols-[1fr_310px] gap-8 py-8">
        <div>
          <p className="eyebrow mb-5">TOKENIZED EQUITIES / BNB SMART CHAIN</p>
          <h1 className="text-4xl md:text-6xl font-medium tracking-[-0.045em] leading-[1.05]">
            Buy the exposure.
            <br />
            <span className="text-[var(--color-accent)]">
              Understand the route.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[var(--color-ink-2)] leading-relaxed">
            One stock. Multiple issuers. Different economics. Compare the
            wrappers, test your policy, and keep the evidence behind every
            decision.
          </p>
        </div>
        <div className="hero-note self-end hidden lg:block">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck size={17} className="text-[var(--color-accent)]" />{" "}
            Your policy is the boundary.
          </div>
          <p className="mt-3 text-sm text-[var(--color-ink-2)] leading-relaxed">
            Start with a recorded market snapshot. No wallet required. Analysis
            never moves funds.
          </p>
          <div className="mt-5 flex gap-2">
            {Object.values(LABELS).map((label) => (
              <span key={label} className="chip">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="panel p-5 md:p-6">
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <label htmlFor="intent" className="eyebrow">
            01 / EXPRESS YOUR INTENT
          </label>
          <label className="flex gap-2 items-center text-xs text-[var(--color-ink-2)]">
            Data source
            <select
              aria-label="Data source"
              className="desk-select"
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              disabled={busy}
            >
              <option value="recorded">RECORDED · reproducible demo</option>
              <option value="live">LIVE · Binance market data</option>
            </select>
          </label>
        </div>
        <form
          className="flex flex-col sm:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <input
            id="intent"
            className="desk-input flex-1 min-w-0 text-lg"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            disabled={busy}
          />
          <button className="desk-primary" disabled={busy || !text.trim()}>
            {busy ? "Working…" : "Compare exposure"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-4">
          {["NVDA", "AAPL", "TSLA"].map((ticker) => (
            <button
              key={ticker}
              disabled={busy}
              className="desk-secondary"
              onClick={() => setText(`Buy $10 of ${ticker}`)}
            >
              {ticker}
            </button>
          ))}
          <span className="text-xs text-[var(--color-ink-3)] self-center ml-1">
            BUY analysis · set risk limits below
          </span>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-[var(--color-fail)]">
            {error}
          </p>
        )}
      </section>

      <div className="grid lg:grid-cols-[270px_1fr] gap-5 items-start">
        <aside
          id="risk-policy"
          className="panel p-5 space-y-5 order-2 lg:order-1"
        >
          <div>
            <p className="eyebrow">02 / RISK POLICY</p>
            <p className="mt-2 text-xs text-[var(--color-ink-2)]">
              Explicit limits. Deterministic checks.
            </p>
          </div>
          <NumberField
            label="Maximum premium (bps)"
            value={policy.max_premium_bps}
            max={10000}
            onChange={(v) => setPolicy({ ...policy, max_premium_bps: v })}
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
            onChange={(v) => setPolicy({ ...policy, max_slippage_bps: v })}
          />
          <NumberField
            label="Minimum executable liquidity ($)"
            value={policy.min_liquidity_usd}
            max={1000000000}
            onChange={(v) => setPolicy({ ...policy, min_liquidity_usd: v })}
          />
          <fieldset className="space-y-2">
            <legend className="text-xs text-[var(--color-ink-2)] mb-2">
              Allowed issuers
            </legend>
            {Object.entries(LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={policy.allowed_platforms.includes(key)}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      allowed_platforms: e.target.checked
                        ? [...policy.allowed_platforms, key]
                        : policy.allowed_platforms.filter((p) => p !== key),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="flex gap-2 text-xs">
            <input
              type="checkbox"
              checked={policy.require_attestation}
              onChange={(e) =>
                setPolicy({ ...policy, require_attestation: e.target.checked })
              }
            />
            Require issuer report link
          </label>
          <label className="flex gap-2 text-xs">
            <input
              type="checkbox"
              checked={policy.allow_closed_market}
              onChange={(e) =>
                setPolicy({ ...policy, allow_closed_market: e.target.checked })
              }
            />
            Allow closed-market analysis
          </label>
          <button
            className="desk-secondary w-full"
            disabled={!receipt || busy}
            onClick={() => compare(policy)}
          >
            Apply to same snapshot
          </button>
          {dirty && (
            <p className="text-xs text-[var(--color-warn)]">
              Policy edits pending. Results still use the policy in the receipt.
            </p>
          )}
          <p className="text-xs text-[var(--color-ink-3)] leading-relaxed">
            Slippage needs a quote. Liquidity needs depth evidence. Unknown
            values cannot satisfy a required limit.
          </p>
        </aside>

        <section
          className="space-y-4 min-w-0 order-1 lg:order-2"
          aria-live="polite"
          aria-busy={busy}
        >
          {!receipt ? (
            <div className="panel p-8 md:p-12 min-h-96 flex flex-col justify-center">
              <p className="eyebrow">THE DECISION, NOT JUST THE PRICE</p>
              <h2 className="text-2xl tracking-tight mt-4">
                Which NVIDIA token actually fits your intent?
              </h2>
              <p className="text-[var(--color-ink-2)] mt-3 max-w-lg leading-relaxed">
                A cheaper token may represent fewer shares, lack a reference
                price, or fail your policy. EquityMux puts those differences in
                one place.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mt-9">
                {[
                  ["01", "Normalize", "Price per underlying share"],
                  ["02", "Challenge", "Same snapshot, stricter policy"],
                  ["03", "Verify", "Export and replay the decision"],
                ].map(([n, title, desc]) => (
                  <div
                    key={n}
                    className="border-t border-[var(--color-edge)] pt-4"
                  >
                    <span className="mono text-xs text-[var(--color-accent)]">
                      {n}
                    </span>
                    <p className="mt-2 font-medium">{title}</p>
                    <p className="text-xs text-[var(--color-ink-2)] mt-1">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between gap-3 flex-wrap items-center">
                <p className="eyebrow">
                  03 / {receipt.intent.ticker} EXPOSURE COMPARISON
                </p>
                <a
                  href="#risk-policy"
                  className="text-xs text-[var(--color-accent)] lg:hidden"
                >
                  Edit risk policy ↓
                </a>
                <span
                  className={`chip ${receipt.dataLabel === "RECORDED" ? "chip-warn" : "chip-info"}`}
                >
                  {receipt.dataLabel} · ANALYSIS ONLY
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Metric
                  label="Representations"
                  value={String(decision!.routes.length)}
                />
                <Metric
                  label="Displayed price dispersion"
                  value={`${fmt(decision!.dispersionBps, 1)} bps`}
                />
                <Metric
                  label="Passing observed checks"
                  value={`${decision!.routes.filter((r) => r.status === "SHORTLISTED").length} / ${decision!.routes.length}`}
                />
              </div>
              <div
                className={`panel p-5 decision-verdict ${selected ? "decision-pass" : "decision-stop"}`}
              >
                <div className="flex gap-3 items-start">
                  <ShieldCheck size={22} className="shrink-0 mt-1" />
                  <div>
                    <h2 className="text-xl font-medium">
                      {selected
                        ? `${selected.symbol} leads the research shortlist`
                        : "The right decision is to stop."}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--color-ink-2)] leading-relaxed">
                      {decision!.explanation}
                    </p>
                  </div>
                </div>
                {decision!.comparison && (
                  <p className="mt-3 text-xs mono">
                    {fmt(decision!.comparison.displayedPriceAdvantageBps, 1)}{" "}
                    bps lower displayed share price than{" "}
                    {decision!.comparison.against}. Fees and market impact
                    excluded.
                  </p>
                )}
              </div>
              <ParityMap routes={decision!.routes} />
              <div className="space-y-3">
                {decision!.routes.map((route) => (
                  <RouteEvidence
                    key={route.tokenAddress}
                    route={route}
                    selected={route.tokenAddress === decision!.selected}
                  />
                ))}
              </div>
              <div className="panel p-5">
                <p className="eyebrow">CHALLENGE THE DECISION</p>
                <p className="text-sm text-[var(--color-ink-2)] mt-2">
                  What if your policy requires $100,000 of executable liquidity?
                </p>
                <button
                  className="desk-secondary mt-3"
                  disabled={busy}
                  onClick={() =>
                    compare({ ...policy, min_liquidity_usd: "100000" })
                  }
                >
                  Require liquidity evidence <ArrowRight size={14} />
                </button>
                {comparison && (
                  <div className="mt-4 border-t border-[var(--color-edge)] pt-3 text-xs">
                    <p className="text-[var(--color-accent)]">
                      Same snapshot. Only the policy changed.
                    </p>
                    {comparison.changes.length ? (
                      comparison.changes.map((c) => (
                        <p className="mt-2" key={c.symbol}>
                          {c.symbol}: {c.before} → {c.after} ·{" "}
                          {c.blockers.join(", ")}
                        </p>
                      ))
                    ) : (
                      <p className="mt-2">No route status changed.</p>
                    )}
                    <button
                      className="desk-secondary mt-3"
                      disabled={busy}
                      onClick={() => compare(DEFAULT_POLICY)}
                    >
                      Restore baseline policy
                    </button>
                  </div>
                )}
              </div>
              <div className="panel p-5">
                <div className="flex gap-2 items-center">
                  <Fingerprint size={18} />
                  <h2 className="font-medium">04 / Keep the evidence</h2>
                </div>
                <p className="text-xs text-[var(--color-ink-2)] mt-2">
                  Full snapshot + policy + route decisions. Recompute the hash
                  in your browser and replay the logic on the server.
                </p>
                <p className="mono text-xs break-all mt-4 text-[var(--color-accent)]">
                  {receipt.receiptHash}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    className="desk-secondary"
                    onClick={verify}
                    disabled={busy}
                  >
                    <Fingerprint size={14} />
                    Verify & replay
                  </button>
                  <button className="desk-secondary" onClick={download}>
                    <Download size={14} />
                    Download receipt
                  </button>
                </div>
                {proof && (
                  <p className="text-xs mt-3" role="status">
                    {proof}
                  </p>
                )}
                <p className="text-xs text-[var(--color-ink-3)] mt-3">
                  Hash integrity does not authenticate the data source, prove
                  backing, or prove an onchain trade.
                </p>
              </div>
              <div className="panel p-5">
                <p className="eyebrow">EXECUTION / NOT EXECUTED</p>
                <p className="text-sm text-[var(--color-ink-2)] mt-2">
                  Before a trade: fresh executable quote → bound swap simulation
                  → human authorization → onchain verification.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {decision!.execution.blockers.map((b) => (
                    <span className="chip chip-warn" key={b}>
                      {b.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
                <details className="mt-4 text-xs text-[var(--color-ink-2)]">
                  <summary className="cursor-pointer">
                    Evidence limitations
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {decision!.limitations.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </details>
              </div>
            </>
          )}
        </section>
      </div>
      <footer className="border-t border-[var(--color-edge)] pt-5 flex flex-wrap justify-between gap-3 text-xs text-[var(--color-ink-3)]">
        <span>EquityMux / Intent → evidence → policy → decision</span>
        <a className="hover:text-white" href="/agent">
          Built for people and agents ↗
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
    <label className="block text-xs text-[var(--color-ink-2)]">
      {label}
      <input
        className="desk-input w-full mt-2 mono"
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
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-2)]">
        {label}
      </p>
      <p className="mono text-lg md:text-2xl mt-2">{value}</p>
    </div>
  );
}
function RouteEvidence({
  route: r,
  selected,
}: {
  route: DecisionRoute;
  selected: boolean;
}) {
  return (
    <details
      className={`panel route-evidence ${selected ? "route-selected" : ""}`}
    >
      <summary className="p-5 cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-lg font-medium">{r.symbol}</span>
            <span className="ml-2 text-xs text-[var(--color-ink-2)]">
              {LABELS[r.platform]}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <span
              className={`chip ${r.status === "REJECTED" ? "chip-fail" : "chip-pass"}`}
            >
              {r.status === "REJECTED"
                ? "Rejected"
                : selected
                  ? "Research lead"
                  : "Shortlisted"}
            </span>
            <ChevronDown size={14} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <Cell
            label="Price / underlying share"
            value={`$${fmt(r.sharePriceUsd)}`}
          />
          <Cell label="vs. reference" value={`${fmt(r.premiumBps, 1)} bps`} />
          <Cell label="Indicative shares" value={fmt(r.indicativeShares, 6)} />
          <Cell label="Executable depth" value="Unknown" />
        </div>
        <div className="mt-4 text-xs text-[var(--color-ink-2)]">
          {r.blockers.length
            ? `Blocked by: ${r.blockers.join(" · ")}`
            : `Observed checks pass · ${r.marketState.toLowerCase()} session`}
          <span className="float-right">Inspect evidence</span>
        </div>
      </summary>
      <div className="border-t border-[var(--color-edge)] p-5 space-y-4 text-xs">
        <div className="grid sm:grid-cols-2 gap-4">
          <p>
            Token price ${fmt(r.tokenPriceUsd)} ÷ {r.sharesPerToken}{" "}
            shares/token = ${fmt(r.sharePriceUsd)} per share.
          </p>
          <p>
            Reference ${fmt(r.referencePriceUsd)} ·{" "}
            {r.referenceSource ?? "unavailable"}. Source timestamp unverified.
          </p>
        </div>
        {r.checks.map((check) => (
          <div key={check.rule} className="flex gap-2 items-start">
            {check.status === "PASS" ? (
              <Check size={14} className="text-[var(--color-pass)] shrink-0" />
            ) : (
              <X size={14} className="text-[var(--color-fail)] shrink-0" />
            )}
            <span>{check.detail}</span>
          </div>
        ))}
        <p>
          24h volume: ${fmt(r.volume24hUsd)}. Volume is turnover, not liquidity
          depth.
        </p>
        <p className="mono break-all">BSC · {r.tokenAddress}</p>
        <div className="flex flex-wrap gap-2">
          {r.sourceEvidence.map((s, i) => (
            <span key={`${s}-${i}`} className="mono text-[var(--color-ink-3)]">
              {s}
            </span>
          ))}
        </div>
        {r.attestation.daily_url?.startsWith("https://") && (
          <a
            href={r.attestation.daily_url}
            rel="noreferrer"
            target="_blank"
            className="text-[var(--color-info)] underline"
          >
            Issuer report ↗
          </a>
        )}
      </div>
    </details>
  );
}
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--color-ink-2)] uppercase tracking-wide">
        {label}
      </p>
      <p className="mono mt-1 text-sm">{value}</p>
    </div>
  );
}
