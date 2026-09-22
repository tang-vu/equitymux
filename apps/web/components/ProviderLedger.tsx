"use client";

import { Fragment, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, X } from "lucide-react";
import { formatNumber as fmt, type DecisionRoute } from "@/lib/decisions";

const names: Record<string, string> = {
  ondo: "Ondo",
  xstocks: "xStocks",
  bstock: "bStocks",
};

export function ProviderLedger({
  routes,
  selected,
}: {
  routes: DecisionRoute[];
  selected: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="ledger">
      <div className="section-heading">
        <h3>Same equity. Different wrappers.</h3>
        <span className="small-note">Prices normalized per share</span>
      </div>
      <table className="provider-table">
        <caption className="sr-only">
          Tokenized equity providers, normalized prices, parity, liquidity
          evidence and policy decisions
        </caption>
        <thead>
          <tr>
            <th scope="col">Issuer / token</th>
            <th scope="col">Share price</th>
            <th scope="col">Parity</th>
            <th scope="col">Depth</th>
            <th scope="col">Policy</th>
            <th scope="col">
              <span className="sr-only">Evidence</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {routes.map((r) => {
            const open = expanded === r.tokenAddress;
            const lead = r.tokenAddress === selected;
            return (
              <Fragment key={r.tokenAddress}>
                <tr
                  className={"route-evidence" + (lead ? " route-selected" : "")}
                >
                  <td className="issuer-cell">
                    <span className="issuer-mark" data-issuer={r.platform}>
                      {names[r.platform]?.slice(0, 1) ?? "?"}
                    </span>
                    <div>
                      <strong>{names[r.platform] ?? r.platform}</strong>
                      <span className="token-symbol">{r.symbol}</span>
                    </div>
                  </td>
                  <td data-label="Share price" className="ledger-price">
                    ${fmt(r.sharePriceUsd)}
                  </td>
                  <td data-label="vs. reference" className="mono">
                    {fmt(r.premiumBps, 1)} <span className="unit">bps</span>
                  </td>
                  <td data-label="Executable depth">
                    <span className="unknown-value">Unverified</span>
                  </td>
                  <td data-label="Policy">
                    <span
                      className={
                        "route-state " +
                        (r.status === "REJECTED" ? "is-rejected" : "is-passing")
                      }
                    >
                      {r.status === "REJECTED" ? (
                        <X size={13} />
                      ) : (
                        <Check size={13} />
                      )}
                      {r.status === "REJECTED"
                        ? "Rejected"
                        : lead
                          ? "Research lead"
                          : "Shortlisted"}
                    </span>
                  </td>
                  <td className="expand-cell">
                    <button
                      className="evidence-toggle"
                      aria-label={"Inspect " + r.symbol + " evidence"}
                      aria-expanded={open}
                      aria-controls={"evidence-" + r.tokenAddress}
                      onClick={() => setExpanded(open ? null : r.tokenAddress)}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </td>
                </tr>
                {open && (
                  <tr className="evidence-detail">
                    <td colSpan={6}>
                      <div id={"evidence-" + r.tokenAddress}>
                        <div className="normalization-proof">
                          <span className="label">THE NORMALIZATION</span>
                          <p>
                            <strong>${fmt(r.tokenPriceUsd)}</strong>
                            <span>token price</span>
                            <span className="math-symbol">÷</span>
                            <strong>{fmt(r.sharesPerToken, 6)}</strong>
                            <span>shares / token</span>
                            <span className="math-symbol">=</span>
                            <strong>${fmt(r.sharePriceUsd)}</strong>
                            <span>per share</span>
                          </p>
                        </div>
                        <div className="evidence-columns">
                          <div>
                            <span className="label">POLICY CHECKS</span>
                            <ul className="check-list">
                              {r.checks.map((check) => (
                                <li key={check.rule}>
                                  {check.status === "PASS" ? (
                                    <Check size={14} className="pass-icon" />
                                  ) : (
                                    <X size={14} className="fail-icon" />
                                  )}
                                  <span>{check.detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="source-notes">
                            <span className="label">SOURCE NOTES</span>
                            <p>
                              Reference{" "}
                              <strong>${fmt(r.referencePriceUsd)}</strong> from{" "}
                              <code>{r.referenceSource ?? "unavailable"}</code>.
                              Observation time is unverified.
                            </p>
                            <p>
                              24h turnover: ${fmt(r.volume24hUsd)}. This does
                              not establish executable liquidity.
                            </p>
                            <p>
                              Indicative exposure: {fmt(r.indicativeShares, 6)}{" "}
                              shares, before fees and market impact.
                            </p>
                            <a
                              href={
                                "https://bscscan.com/token/" + r.tokenAddress
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Inspect token on BscScan{" "}
                              <ArrowUpRight size={12} />
                            </a>
                            {r.attestation.daily_url?.startsWith(
                              "https://",
                            ) && (
                              <a
                                href={r.attestation.daily_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Issuer report <ArrowUpRight size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                        <details className="raw-sources">
                          <summary>Source identifiers & contract</summary>
                          <code>{r.tokenAddress}</code>
                          <p>{r.sourceEvidence.join(" · ")}</p>
                        </details>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <p className="ledger-footnote">
        <span className="footnote-mark">↳</span> Displayed prices support
        research. An executable quote must establish fees, depth and slippage.
      </p>
    </div>
  );
}
