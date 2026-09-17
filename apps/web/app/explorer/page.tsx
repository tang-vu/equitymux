"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type ExploreResult } from "@/lib/api";

export default function Explorer() {
  const [ticker, setTicker] = useState("NVDA");
  const [q, setQ] = useState("NVDA");
  const [filter, setFilter] = useState("");
  const { data, isFetching, error } = useQuery<ExploreResult>({
    queryKey: ["explore", q],
    queryFn: () => api(`/explore/${q}`),
    enabled: !!q,
  });
  const index = useQuery<{ underlyings: Underlying[] }>({
    queryKey: ["underlyings"],
    queryFn: () => api("/underlyings"),
    staleTime: 60_000,
  });
  const filtered = (index.data?.underlyings ?? []).filter(
    (u) => !filter || u.ticker.includes(filter.toUpperCase()) || (u.name ?? "").toUpperCase().includes(filter.toUpperCase()),
  );

  const closed = data?.market?.openState === false;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equity Explorer</h1>
          <p className="text-sm text-[var(--color-ink-2)] mt-1">
            Every tokenized representation of an underlying, normalized.
          </p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setQ(ticker.toUpperCase()); }} className="flex gap-2">
          <input className="bg-transparent border border-[var(--color-edge)] rounded-lg px-3 py-2 text-sm w-32 mono uppercase"
            value={ticker} onChange={(e) => setTicker(e.target.value)} />
          <button className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-sm font-semibold">
            {isFetching ? "…" : "Explore"}
          </button>
        </form>
      </header>

      {data?.market && (
        <div className={`panel p-4 flex items-center gap-4 ${closed ? "border-[var(--color-warn)]" : ""}`}>
          <span className={`chip ${closed ? "chip-warn" : "chip-pass"}`}>
            {String(data.market.marketStatus ?? "unknown").toUpperCase()}
          </span>
          {closed && <span className="text-sm text-[var(--color-warn)]">Weekend/closed mode — reference price is the last close, not live.</span>}
          {!closed && <span className="text-sm text-[var(--color-ink-2)]">Underlying venue open. Reference price is live.</span>}
          {data.market.nextOpenTime != null && (
            <span className="ml-auto text-xs text-[var(--color-ink-3)] mono">
              next open {new Date(Number(data.market.nextOpenTime)).toUTCString()}
            </span>
          )}
        </div>
      )}

      {error && <div className="panel p-4 text-[var(--color-fail)] text-sm">{(error as Error).message}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        {(data?.representations ?? []).map((r) => (
          <div key={r.token_address} className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{r.token_symbol}</span>
                <span className="chip ml-2">{r.platform}</span>
              </div>
              <span className={`chip ${r.market_state === "REGULAR" ? "chip-pass" : r.market_state === "CLOSED" ? "chip-warn" : "chip-fail"}`}>
                {r.market_state}
              </span>
            </div>
            <div className="mono text-[11px] text-[var(--color-ink-3)] break-all">{r.token_address}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Field k="token price" v={fmt(r.token_price_usd)} />
              <Field k="reference" v={fmt(r.reference_price_usd) + (r.reference_price_source && r.reference_price_source !== "stockInfo" ? ` (${r.reference_price_source})` : "")} />
              <Field k="shares/token" v={r.shares_per_token} />
              <Field k="decimals" v={String(r.decimals)} />
              <Field k="holders" v={r.liquidity.holders?.toLocaleString() ?? "—"} />
              <Field k="mkt cap" v={r.liquidity.market_cap_usd ? "$" + Number(r.liquidity.market_cap_usd).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"} />
            </div>
            {r.attestation.supported && (
              <a className="text-xs text-[var(--color-info)] underline" href={r.attestation.daily_url ?? "#"} target="_blank">
                attestation report ↗
              </a>
            )}
            <div className="text-[10px] text-[var(--color-ink-3)] mono">
              {r.source_evidence.join(" · ")}
            </div>
          </div>
        ))}
      </div>

      <section className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm">BSC Underlyings Index</h2>
          <input
            className="bg-transparent border border-[var(--color-edge)] rounded-lg px-3 py-1.5 text-xs w-56 mono"
            placeholder="filter ticker / name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <p className="text-xs text-[var(--color-ink-3)] mb-3">
          {index.isLoading
            ? "loading…"
            : index.error
              ? `index unavailable: ${(index.error as Error).message}`
              : `${filtered.length} / ${index.data?.underlyings.length ?? 0} underlyings listed on BSC across Ondo, xStocks, bStock.`}
        </p>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--color-panel)]">
              <tr className="text-left text-[var(--color-ink-3)]">
                <th className="py-1.5 pr-3 font-normal">ticker</th>
                <th className="py-1.5 pr-3 font-normal">name</th>
                <th className="py-1.5 font-normal">platforms</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((u) => (
                <tr key={u.ticker} className="border-t border-[var(--color-edge)] hover:bg-[var(--color-panel-2)]">
                  <td className="py-1.5 pr-3">
                    <button className="mono text-[var(--color-accent)]" onClick={() => { setTicker(u.ticker); setQ(u.ticker); }}>
                      {u.ticker}
                    </button>
                  </td>
                  <td className="py-1.5 pr-3 text-[var(--color-ink-2)] truncate max-w-64">{u.name ?? "—"}</td>
                  <td className="py-1.5">
                    {Object.keys(u.platforms).sort().map((p) => (
                      <span key={p} className="chip mr-1">{p}</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <p className="text-[10px] text-[var(--color-ink-3)] mt-2">showing first 200 — refine the filter</p>
          )}
        </div>
      </section>
    </div>
  );
}

interface Underlying {
  ticker: string;
  name: string | null;
  platforms: Record<string, { symbol: string | null; tokenAddress: string | null }>;
  count: number;
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[var(--color-ink-3)]">{k}</div>
      <div className="mono">{v}</div>
    </div>
  );
}

function fmt(v: string | null): string {
  return v == null ? "—" : "$" + Number(v).toFixed(2);
}
