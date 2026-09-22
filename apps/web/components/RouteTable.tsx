"use client";

import { Fragment, useState } from "react";
import type { Candidate } from "@/lib/api";

const STATUS_CHIP: Record<string, string> = {
  ELIGIBLE: "chip-pass",
  REJECTED: "chip-fail",
  REQUIRES_CONFIRMATION: "chip-warn",
  SIMULATION_FAILED: "chip-fail",
  STALE_REFERENCE: "chip-fail",
  NO_QUOTE: "chip-fail",
};

const PLATFORM_LABEL: Record<string, string> = {
  ondo: "Ondo",
  xstocks: "xStocks",
  bstock: "bStocks",
};

function num(v: string | null | undefined, digits = 2): string {
  if (v == null) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export function RouteTable({
  candidates,
  selected,
}: {
  candidates: Candidate[];
  selected?: Candidate;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-[var(--color-ink-3)] border-b border-[var(--color-edge)]">
            <th className="px-4 py-3">Representation</th>
            <th className="px-3 py-3 text-right">Token $</th>
            <th className="px-3 py-3 text-right">Ref $</th>
            <th className="px-3 py-3 text-right">Premium</th>
            <th className="px-3 py-3 text-right">Slippage</th>
            <th className="px-3 py-3">Market</th>
            <th className="px-3 py-3 text-right">Score</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const rep = c.representation;
            const isSel =
              selected?.representation.token_address === rep.token_address;
            const fails =
              c.policy?.results.filter((r) => r.status === "FAIL") ?? [];
            return (
              <Fragment key={rep.token_address}>
                <tr
                  onClick={() =>
                    setOpen(
                      open === rep.token_address ? null : rep.token_address,
                    )
                  }
                  className={`border-b border-[var(--color-edge)] cursor-pointer transition-colors hover:bg-[var(--color-panel-2)] ${isSel ? "bg-[var(--color-panel-2)]" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rep.token_symbol}</span>
                      <span className="chip">
                        {PLATFORM_LABEL[rep.platform] ?? rep.platform}
                      </span>
                      {isSel && (
                        <span className="chip chip-pass">selected</span>
                      )}
                    </div>
                    <div className="mono text-[11px] text-[var(--color-ink-3)] mt-0.5">
                      {rep.token_address}
                    </div>
                  </td>
                  <td className="px-3 py-3 table-num mono">
                    {num(rep.token_price_usd)}
                  </td>
                  <td className="px-3 py-3 table-num mono">
                    {num(rep.reference_price_usd)}
                  </td>
                  <td
                    className={`px-3 py-3 table-num mono ${
                      c.premium_bps && Number(c.premium_bps) > 40
                        ? "text-[var(--color-fail)]"
                        : "text-[var(--color-pass)]"
                    }`}
                  >
                    {c.premium_bps != null
                      ? `${num(c.premium_bps, 1)} bps`
                      : "—"}
                  </td>
                  <td className="px-3 py-3 table-num mono">
                    {c.expected_slippage_bps != null
                      ? `${c.expected_slippage_bps} bps`
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`chip ${
                        rep.market_state === "REGULAR"
                          ? "chip-pass"
                          : rep.market_state === "CLOSED"
                            ? "chip-warn"
                            : rep.market_state === "HALTED"
                              ? "chip-fail"
                              : ""
                      }`}
                    >
                      {rep.market_state}
                    </span>
                  </td>
                  <td className="px-3 py-3 table-num mono">
                    {c.score != null ? num(c.score, 0) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${STATUS_CHIP[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
                {open === rep.token_address && (
                  <tr className="bg-[var(--color-panel-2)]">
                    <td colSpan={8} className="px-5 py-4">
                      <div className="grid md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-[var(--color-ink-3)] uppercase tracking-wider mb-1">
                            Normalization
                          </div>
                          <div className="space-y-1 mono">
                            <div>
                              shares/token:{" "}
                              <span className="text-ink">
                                {rep.shares_per_token}
                              </span>
                            </div>
                            <div>
                              decimals:{" "}
                              <span className="text-ink">{rep.decimals}</span>
                            </div>
                            <div>
                              ref age:{" "}
                              <span className="text-ink">
                                {c.reference_age_s ?? "—"}s
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--color-ink-3)] uppercase tracking-wider mb-1">
                            Policy evaluation
                          </div>
                          <div className="space-y-1">
                            {(c.policy?.results ?? []).map((r, i) => (
                              <div key={i} className="flex gap-2">
                                <span
                                  className={`chip shrink-0 ${
                                    r.status === "PASS"
                                      ? "chip-pass"
                                      : r.status === "FAIL"
                                        ? "chip-fail"
                                        : "chip-warn"
                                  }`}
                                >
                                  {r.status}
                                </span>
                                <span className="text-[var(--color-ink-2)]">
                                  {r.rule}: {r.detail}
                                </span>
                              </div>
                            ))}
                            {fails.length === 0 && !c.policy && (
                              <span className="text-[var(--color-ink-3)]">
                                not evaluated ({c.status})
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--color-ink-3)] uppercase tracking-wider mb-1">
                            Evidence & score
                          </div>
                          <div className="space-y-1 text-[var(--color-ink-2)]">
                            {rep.source_evidence.map((e) => (
                              <div key={e} className="mono">
                                · {e}
                              </div>
                            ))}
                            {rep.attestation.supported &&
                              rep.attestation.daily_url && (
                                <a
                                  className="text-[var(--color-info)] underline block"
                                  href={rep.attestation.daily_url}
                                  target="_blank"
                                >
                                  daily attestation ↗
                                </a>
                              )}
                            {c.quote && (
                              <div className="mono">
                                quote: {c.quote.from_amount}{" "}
                                {c.quote.from_symbol} → {c.quote.to_amount}{" "}
                                {c.quote.to_symbol}
                              </div>
                            )}
                            {Object.entries(c.score_breakdown).map(([k, v]) => (
                              <div key={k} className="mono">
                                score[{k}]: -{num(v, 1)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
