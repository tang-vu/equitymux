"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

const EXAMPLES = [
  "Never spend my last $100 USDC",
  "Never put more than 20% of the portfolio into one company",
  "Never pay more than 50 basis points over reference price",
  "Maximum expected slippage 30 basis points",
  "Every transaction must simulate successfully",
  "When the underlying stock market is closed, maximum premium is 20 basis points",
  "Reject stale reference data older than 10 minutes",
  "Only trade approved platforms: ondo and bstocks",
  "Ask me before any transaction over $100",
  "Autonomous rebalances may spend at most $50 per day",
];

const DEFAULT = `My Constitution:
Never spend my last $50 USDC.
Never put more than 20% of the portfolio into one company.
Never pay more than 40 basis points over reference price.
Maximum expected slippage 30 basis points.
Every transaction must simulate successfully.
When the underlying stock market is closed, maximum premium is 20 basis points.
Reject stale reference data older than 10 minutes.
Ask me before any transaction over $25.`;

export default function ConstitutionPage() {
  const qc = useQueryClient();
  const [text, setText] = useState(DEFAULT);
  const [draft, setDraft] = useState<any>(null);

  const active = useQuery({ queryKey: ["constitution"], queryFn: () => api<any>("/constitution") });
  const history = useQuery({ queryKey: ["constitution-history"], queryFn: () => api<any>("/constitution/history") });

  const compile = useMutation({
    mutationFn: () => api<any>("/constitution/compile", { method: "POST", body: JSON.stringify({ text }) }),
    onSuccess: setDraft,
  });
  const approve = useMutation({
    mutationFn: () => api<any>("/constitution/approve", {
      method: "POST",
      body: JSON.stringify({ nl_text: text, constitution: draft.constitution }),
    }),
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["constitution"] });
      qc.invalidateQueries({ queryKey: ["constitution-history"] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio Constitution</h1>
        <p className="text-sm text-[var(--color-ink-2)] mt-1">Your money follows rules, not prompts.</p>
      </header>

      {active.data?.active && (
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="chip chip-pass">active · rev {active.data.active.revision}</span>
            <span className="mono text-xs text-[var(--color-accent)]">{active.data.active.hash}</span>
          </div>
          <pre className="mt-3 text-xs text-[var(--color-ink-2)] whitespace-pre-wrap">{active.data.active.nl_text}</pre>
          <details className="mt-2">
            <summary className="text-xs text-[var(--color-ink-3)] cursor-pointer">canonical JSON</summary>
            <pre className="mt-2 text-[11px] mono overflow-auto max-h-64">{JSON.stringify(active.data.active.canonical, null, 2)}</pre>
          </details>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="panel p-5">
          <h2 className="text-sm font-medium mb-2">Natural language</h2>
          <textarea
            className="w-full h-72 bg-transparent border border-[var(--color-edge)] rounded-lg p-3 text-sm mono"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => (
              <button key={e} className="text-[11px] px-2 py-1 rounded-full border border-[var(--color-edge)] text-[var(--color-ink-3)] hover:text-ink"
                onClick={() => setText((t) => t + "\n" + e + ".")}>
                + {e}
              </button>
            ))}
          </div>
          <button className="mt-3 px-5 py-2 rounded-lg bg-[var(--color-panel-2)] border border-[var(--color-edge)] text-sm font-medium"
            onClick={() => compile.mutate()} disabled={compile.isPending}>
            {compile.isPending ? "Compiling…" : "Compile policy"}
          </button>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-medium mb-2">Compiled policy</h2>
          {!draft && <p className="text-sm text-[var(--color-ink-3)]">Compile to review the exact rules that will be enforced. Nothing activates until you approve.</p>}
          {draft && (
            <>
              <pre className="text-[11px] mono overflow-auto max-h-64 bg-[var(--color-bg)] rounded-lg p-3">
                {JSON.stringify(draft.constitution, null, 2)}
              </pre>
              {draft.uncompiledSentences?.length > 0 && (
                <div className="mt-3 text-xs">
                  <span className="chip chip-warn">not compiled</span>
                  <ul className="mt-1.5 space-y-1 text-[var(--color-ink-2)]">
                    {draft.uncompiledSentences.map((s: string, i: number) => <li key={i}>· {s}</li>)}
                  </ul>
                </div>
              )}
              <button className="mt-4 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-sm font-semibold"
                onClick={() => approve.mutate()} disabled={approve.isPending}>
                Approve & activate (hash + version recorded)
              </button>
              {approve.isError && <div className="mt-2 text-xs text-[var(--color-fail)]">{(approve.error as Error).message}</div>}
            </>
          )}
        </div>
      </div>

      {history.data?.history?.length > 0 && (
        <div className="panel p-4">
          <h2 className="text-sm font-medium mb-2">Revision history</h2>
          <div className="space-y-1 text-xs mono">
            {history.data.history.map((h: any) => (
              <div key={h.hash} className="flex gap-3 items-center">
                <span className={h.active ? "chip chip-pass" : "chip"}>{h.active ? "active" : `rev ${h.revision}`}</span>
                <span className="text-[var(--color-ink-3)]">{h.hash?.slice(0, 18)}…</span>
                <span className="text-[var(--color-ink-3)]">{h.approved_at ?? h.created_at}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
