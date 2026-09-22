"use client";

import { WorkspaceIntro } from "@/components/WorkspaceIntro";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type RunResult, type Health } from "@/lib/api";
import { RouteTable } from "@/components/RouteTable";
import { PipelineStages } from "@/components/PipelineStages";
import { ReceiptCard } from "@/components/ReceiptCard";

const QUICK = [
  "Buy $10 of NVIDIA under my Constitution",
  "Find the safest representation of Apple",
  "Show tokenized-stock premiums while the market is closed",
  "Buy $5 of TSLA with USDT",
];

export default function Terminal() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
  });

  const run = useMutation({
    mutationFn: (confirm: boolean) =>
      api<RunResult>("/intent", {
        method: "POST",
        body: JSON.stringify({ text, confirm }),
      }),
    onSuccess: setResult,
  });

  const needsConfirm = result?.state === "AWAITING_CONFIRMATION";

  return (
    <div className="workspace-page space-y-8">
      <WorkspaceIntro
        index="05 / EXECUTION PIPELINE"
        title="Research meets its boundary."
        description="Inspect the legacy intent pipeline, from discovery to policy checks. The current wallet adapter cannot bind swap simulation to the submitted transaction; execution fails closed."
      />
      <div className="workspace-boundary">
        <strong>BOUND SWAP SIMULATION · BLOCKED</strong>
        <p>
          A quote or balance probe is not transaction-bound simulation. A
          confirmation boolean is not authentication. The execution kill switch
          remains off by default.
        </p>
      </div>

      <section className="panel p-5">
        <label
          htmlFor="terminal-intent"
          className="text-xs uppercase tracking-widest text-[var(--color-ink-3)]"
        >
          What exposure do you want?
        </label>
        <div className="mt-2 flex gap-3">
          <input
            id="terminal-intent"
            className="flex-1 bg-transparent border border-[var(--color-edge)] rounded-lg px-4 py-3 text-lg"
            placeholder="Buy $10 of NVIDIA exposure under my Constitution"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && text && run.mutate(false)}
          />
          <button
            className="px-6 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold disabled:opacity-40"
            disabled={!text || run.isPending}
            onClick={() => run.mutate(false)}
          >
            {run.isPending ? "Routing…" : "Route intent"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setText(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-edge)] text-[var(--color-ink-2)] hover:text-ink hover:border-[var(--color-accent)] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
        {run.isError && (
          <div className="mt-3 text-sm text-[var(--color-fail)]">
            {(run.error as Error).message}
            {String((run.error as Error).message).includes("constitution") && (
              <a href="/constitution" className="underline ml-1">
                Set up your Constitution →
              </a>
            )}
          </div>
        )}
      </section>

      {result && (
        <section className="space-y-5 stage-in">
          <PipelineStages
            transitions={result.receipt.transitions}
            state={result.state}
          />
          {result.candidates && result.candidates.length > 0 && (
            <div>
              <h2 className="text-sm uppercase tracking-widest text-[var(--color-ink-3)] mb-2">
                Same company. Different wrappers. One execution policy.
              </h2>
              <RouteTable
                candidates={result.candidates}
                selected={result.selected}
              />
            </div>
          )}
          {needsConfirm && (
            <div className="panel p-4 flex items-center justify-between border-[var(--color-warn)]">
              <div className="text-sm">
                <span className="chip chip-warn mr-2">
                  confirmation required
                </span>
                This legacy confirmation flag is not authenticated authorization
                and cannot bypass execution blockers.
              </div>
              <button
                className="px-5 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold text-sm"
                onClick={() => run.mutate(true)}
                disabled={run.isPending}
              >
                Confirm & continue
              </button>
            </div>
          )}
          <ReceiptCard
            key={result.receipt.receiptHash}
            receipt={result.receipt}
          />
        </section>
      )}

      {!result && health && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat
            label="Execution"
            value={
              health.executionEnabled ? "ENABLED" : "disabled (safe default)"
            }
            warn={!health.executionEnabled}
          />
          <Stat
            label="Agentic Wallet"
            value={health.agenticWallet?.status ?? "Unknown"}
            warn={health.agenticWallet?.status !== "CONNECTED"}
          />
          <Stat
            label="Underlying market"
            value={health.binanceRwa?.marketStatus ?? "unknown"}
          />
          <Stat
            label="BSC block"
            value={health.bscRpc?.block?.toLocaleString() ?? "—"}
          />
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="panel p-3">
      <div className="text-xs text-[var(--color-ink-3)]">{label}</div>
      <div
        className={`mt-1 font-medium ${warn ? "text-[var(--color-warn)]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
