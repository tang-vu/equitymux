"use client";

import { WorkspaceIntro } from "@/components/WorkspaceIntro";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api, type RunResult } from "@/lib/api";
import { PipelineStages } from "@/components/PipelineStages";
import { RouteTable } from "@/components/RouteTable";

export default function RoutesPage() {
  const [text, setText] = useState("Buy $10 of NVIDIA under my Constitution");
  const [result, setResult] = useState<RunResult | null>(null);
  const run = useMutation({
    mutationFn: () =>
      api<RunResult>("/intent", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    onSuccess: setResult,
  });

  return (
    <div className="workspace-page space-y-6">
      <WorkspaceIntro
        index="05 / LEGACY ROUTING"
        title="Follow the decision."
        description="Compare legacy execution candidates under the active Constitution and system ceilings. A research shortlist alone cannot authorize a transaction."
      ></WorkspaceIntro>
      <div className="workspace-boundary">
        <strong>EXECUTION REMAINS BLOCKED</strong>
        <p>
          The wallet adapter cannot provide a transaction-bound swap simulation.
          Inspect reason codes below; policy eligibility does not prove a trade.
        </p>
      </div>
      <div className="panel p-4 flex gap-3">
        <input
          aria-label="Legacy route intent"
          className="flex-1 bg-transparent border border-[var(--color-edge)] rounded-lg px-4 py-2.5 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-sm font-semibold"
          onClick={() => run.mutate()}
          disabled={run.isPending}
        >
          {run.isPending ? "Evaluating…" : "Run tournament"}
        </button>
      </div>
      {run.isError && (
        <div className="panel p-4 text-[var(--color-fail)] text-sm">
          {(run.error as Error).message}
        </div>
      )}
      {result && (
        <PipelineStages
          transitions={result.receipt.transitions}
          state={result.state}
        />
      )}
      {result?.candidates && (
        <RouteTable candidates={result.candidates} selected={result.selected} />
      )}
    </div>
  );
}
