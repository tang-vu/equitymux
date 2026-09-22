"use client";

import { useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { formatNumber as fmt, type DecisionReceipt } from "@/lib/decisions";

const names: Record<string, string> = {
  ondo: "Ondo",
  xstocks: "xStocks",
  bstock: "bStocks",
};
const chapters = [
  [
    "Observe",
    "Different wrappers. Different units.",
    "Each sleeve contains the observed token price and its shares-per-token multiplier. Legal rights, backing and redemption terms remain issuer-specific.",
  ],
  [
    "Normalize",
    "One explicit basis: USD / share.",
    "Divide token price by shares per token. The service supplies the normalized result using Decimal arithmetic. A common unit makes comparison possible; it does not make prices equal.",
  ],
  [
    "Apply policy",
    "Evidence passes through your policy.",
    "Issuer, reference, premium and market checks narrow the shortlist. Requiring unavailable executable depth rejects a route. Volume cannot fill that gap.",
  ],
  [
    "Keep evidence",
    "A decision travels with its inputs.",
    "The record carries the snapshot, policy, alternatives and reasons. NOT_EXECUTED is the boundary: replay checks consistency, never a completed purchase.",
  ],
];

export function NormalizationScene({
  receipt,
  inspected,
  onInspect,
}: {
  receipt: DecisionReceipt;
  inspected: string | null;
  onInspect: (address: string) => void;
}) {
  const [chapter, setChapter] = useState(1);
  const routes = receipt.decision.routes;
  const prices = routes.flatMap((r) =>
    r.sharePriceUsd !== null && Number.isFinite(Number(r.sharePriceUsd))
      ? [Number(r.sharePriceUsd)]
      : [],
  );
  const maximum = Math.max(1, ...prices) * 1.05;
  return (
    <section
      className="normalization-scene"
      aria-label="Exposure normalization instrument"
    >
      <div className="instrument-heading">
        <span className="label">01 / ALIGN THE UNITS</span>
        <span className="label">BSC · USD / UNDERLYING SHARE</span>
      </div>
      <div className="instrument-body">
        <div className="instrument-asset">
          <span className="label">SELECTED UNDERLYING</span>
          <strong>{receipt.intent.ticker}</strong>
          <p>
            One company.
            <br />
            <span>{routes.length} representations.</span>
          </p>
          <span className="instrument-boundary">
            {receipt.decision.execution.status}
          </span>
        </div>
        <div className="issuer-sleeves">
          {routes.map((r, i) => (
            <button
              key={r.tokenAddress}
              type="button"
              className="issuer-sleeve"
              data-issuer={r.platform}
              aria-pressed={inspected === r.tokenAddress}
              aria-label={"Select " + r.symbol + " normalization"}
              onClick={() => onInspect(r.tokenAddress)}
            >
              <span className="sleeve-heading">
                <span>{names[r.platform] ?? r.platform}</span>
                <ArrowUpRight size={17} />
              </span>
              <svg
                className="sleeve-glyph"
                viewBox="0 0 200 70"
                aria-hidden="true"
              >
                <path
                  d={
                    i % 3 === 0
                      ? "M10 60V10h150v50H10m25 0V22h150v38H35m25 0V34h130v26H60"
                      : i % 3 === 1
                        ? "M15 60 60 10h35L50 60m30 0 45-50h35l-45 50m30 0 45-50"
                        : "M10 15h180M10 35h180M10 55h180M30 5v60M100 5v60M170 5v60"
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
              <span className="sleeve-symbol">{r.symbol}</span>
              <span className="sleeve-equation">
                <span>
                  <b>
                    {r.tokenPriceUsd == null
                      ? "Unknown"
                      : "$" + fmt(r.tokenPriceUsd, 4)}
                  </b>
                  <small>token price</small>
                </span>
                <span aria-hidden="true">÷</span>
                <span>
                  <b>{fmt(r.sharesPerToken, 6)}</b>
                  <small>shares / token</small>
                </span>
              </span>
              <span className="sleeve-result">
                <ArrowDown size={16} />
                <span>
                  <b>
                    {r.sharePriceUsd == null
                      ? "Unknown"
                      : "$" + fmt(r.sharePriceUsd)}
                  </b>
                  <small>USD / underlying share</small>
                </span>
              </span>
              <span
                className={
                  "sleeve-policy " +
                  (r.status === "SHORTLISTED" ? "is-passing" : "is-rejected")
                }
              >
                {r.status === "SHORTLISTED"
                  ? "✓ Passes observed checks"
                  : "× Rejected by policy"}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div
        className="unit-ruler"
        aria-label="Normalized price scale from zero in US dollars per underlying share"
      >
        <p className="small-note">
          Displayed values rounded. Full precision travels in the receipt.
        </p>
        <div className="ruler-axis">
          <span>$0</span>
          <span>Shared basis · USD / underlying share</span>
          <span>${fmt(String(maximum))}</span>
        </div>
        {routes.map((r) => (
          <div className="ruler-row" key={r.tokenAddress}>
            <span>{r.symbol}</span>
            <div className="ruler-track">
              {r.sharePriceUsd !== null &&
                Number.isFinite(Number(r.sharePriceUsd)) && (
                  <span
                    style={{
                      width: `${(Number(r.sharePriceUsd) / maximum) * 100}%`,
                    }}
                    className={
                      inspected === r.tokenAddress ? "ruler-selected" : ""
                    }
                  />
                )}
            </div>
            <span>
              {r.sharePriceUsd == null ? "Unknown" : "$" + fmt(r.sharePriceUsd)}
            </span>
          </div>
        ))}
      </div>
      <details className="normalization-explainer">
        <summary>
          Explain normalization <span>Four chapters, at your pace +</span>
        </summary>
        <div className="chapter-buttons" aria-label="Normalization chapters">
          {chapters.map(([name], i) => (
            <button
              key={name}
              aria-pressed={chapter === i}
              onClick={() => setChapter(i)}
            >
              {String(i + 1).padStart(2, "0")} / {name}
            </button>
          ))}
        </div>
        <div className="chapter-copy" aria-live="polite">
          <h3>{chapters[chapter][1]}</h3>
          <p>{chapters[chapter][2]}</p>
        </div>
      </details>
    </section>
  );
}
