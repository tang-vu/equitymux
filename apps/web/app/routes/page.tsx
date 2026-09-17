"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api, type RunResult } from "@/lib/api";
import { RouteTable } from "@/components/RouteTable";

export default function RoutesPage() {
  const [text, setText] = useState("Buy $10 of NVIDIA under my Constitution");
  const [result, setResult] = useState<RunResult | null>(null);
  const run = useMutation({
    mutationFn: () => api<RunResult>("/intent", { method: "POST", body: JSON.stringify({ text }) }),
    onSuccess: setResult,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Route Comparison</h1>
        <p className="text-sm text-[var(--color-ink-2)] mt-1">
          Same company. Different wrappers. One execution policy.
        </p>
      </header>
      <div className="panel p-4 flex gap-3">
        <input className="flex-1 bg-transparent border border-[var(--color-edge)] rounded-lg px-4 py-2.5 text-sm"
          value={text} onChange={(e) => setText(e.target.value)} />
        <button className="px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-sm font-semibold"
          onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? "Evaluating…" : "Run tournament"}
        </button>
      </div>
      {run.isError && <div className="panel p-4 text-[var(--color-fail)] text-sm">{(run.error as Error).message}</div>}
      {result?.candidates && <RouteTable candidates={result.candidates} selected={result.selected} />}
    </div>
  );
}
