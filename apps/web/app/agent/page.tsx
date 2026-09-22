"use client";

import { WorkspaceIntro } from "@/components/WorkspaceIntro";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, AgentIdentity, TaskResult, X402Info } from "@/lib/api";

const LAYERS = [
  {
    n: 1,
    name: "Portfolio Constitution",
    desc: "Your typed rules — reserve, concentration, premium, slippage, market-hours",
  },
  {
    n: 2,
    name: "Deterministic policy engine",
    desc: "System ceilings + per-rule PASS/FAIL/CONFIRM, fully explainable",
  },
  {
    n: 3,
    name: "Swap simulation — BLOCKED",
    desc: "Current wallet quotes do not bind the later swap calldata; execution stops here",
  },
  {
    n: 4,
    name: "Agentic Wallet policy",
    desc: "Daily limits, token allowlist, abnormal-txn handling — enforced wallet-side",
  },
  {
    n: 5,
    name: "On-chain verification — required",
    desc: "Release gate: confirmed BSC receipt and resulting position; not demonstrated in this build",
  },
];

export default function AgentOps() {
  const qc = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ["agent"],
    queryFn: () => api<AgentIdentity>("/agent/identity"),
  });
  const x402 = useQuery({
    queryKey: ["x402"],
    queryFn: () => api<X402Info>("/agent/x402"),
  });
  const [input, setInput] = useState(
    '{"text": "Buy $10 of NVDA", "mode": "recorded"}',
  );
  const paid = useMutation({
    mutationFn: () =>
      api<TaskResult>("/agent/tasks/paid", {
        method: "POST",
        body: JSON.stringify({
          kind: "ANALYZE_EXPOSURE",
          input: JSON.parse(input),
        }),
      }),
  });
  const task = useMutation({
    mutationFn: () =>
      api<TaskResult>("/agent/tasks", {
        method: "POST",
        body: JSON.stringify({
          kind: "ANALYZE_EXPOSURE",
          input: JSON.parse(input),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent"] }),
  });

  const agent = data?.agent;
  return (
    <div className="workspace-page space-y-6">
      <WorkspaceIntro
        index="04 / AGENT WORKSPACE"
        title="Bounded by design."
        description="Run ANALYZE_EXPOSURE tasks through the same deterministic service. Inspect real results, integration status and task history."
      ></WorkspaceIntro>

      {(error || x402.error) && (
        <p role="alert" className="api-error">
          {(error || x402.error)?.message}
        </p>
      )}
      <div className="workspace-boundary">
        <strong>ANALYZE_EXPOSURE ONLY</strong>
        <p>
          No signing, funding or payment authority. Agent Studio supplies a
          scaffold and task hook; hosted identity and paid settlement remain
          separate integrations.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="panel p-5">
          <h2 className="text-sm font-medium mb-3">EquityMux Keeper</h2>
          <div className="space-y-2 text-xs mono">
            <Row k="name" v={agent?.name ?? "EquityMux Keeper"} />
            <Row
              k="erc-8004"
              v={
                agent?.erc8004 ??
                (data ? "not registered (local runtime)" : "Unknown")
              }
            />
            <Row k="network" v={agent?.network ?? "Unknown"} />
            <Row k="endpoint" v={agent?.endpoint ?? "Unknown"} />
            <Row k="status" v={agent?.status ?? "Unknown"} />
          </div>
          <div className="mt-4">
            <div className="text-xs text-[var(--color-ink-3)] mb-1.5">
              Submit bounded task (ANALYZE_EXPOSURE):
            </div>
            <div className="flex gap-2">
              <input
                aria-label="ANALYZE_EXPOSURE task JSON"
                className="flex-1 bg-transparent border border-[var(--color-edge)] rounded-lg px-3 py-2 text-xs mono"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                className="px-4 py-2 rounded-lg bg-[var(--color-panel-2)] border border-[var(--color-edge)] text-xs font-medium"
                onClick={() => task.mutate()}
                disabled={task.isPending}
              >
                Submit
              </button>
            </div>
            {task.isError && (
              <div className="mt-2 text-xs text-[var(--color-fail)]">
                {(task.error as Error).message}
              </div>
            )}
            {task.data && (
              <pre className="mt-3 text-[11px] mono overflow-auto max-h-56 bg-[var(--color-bg)] rounded-lg p-3">
                {JSON.stringify(task.data.output, null, 2)}
              </pre>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel p-5">
            <h2 className="text-sm font-medium mb-3">x402 payment surface</h2>
            <div className="space-y-2 text-xs mono">
              <Row k="surface" v={x402.data?.x402?.surface ?? "…"} />
              <Row k="challenge" v={x402.data?.x402?.challenge ?? "…"} />
              <Row k="settlement" v={x402.data?.x402?.settlement ?? "…"} />
              <Row
                k="payTo"
                v={
                  !x402.data
                    ? "Unknown"
                    : x402.data.x402.payToConfigured
                      ? "configured"
                      : "not configured"
                }
              />
            </div>
            <button
              className="mt-3 text-xs px-3 py-1.5 rounded border border-[var(--color-edge)] hover:border-[var(--color-accent)] disabled:opacity-50"
              disabled={paid.isPending}
              onClick={() => paid.mutate()}
            >
              {paid.isPending ? "probing…" : "probe POST /api/agent/tasks/paid"}
            </button>
            {paid.isError && (
              <p className="mt-2 text-xs text-[var(--color-warn)]">
                {(paid.error as Error).message}
              </p>
            )}
            {paid.data && (
              <pre className="mt-2 text-[11px] mono overflow-auto max-h-40 bg-[var(--color-bg)] rounded-lg p-3">
                {JSON.stringify(paid.data, null, 2)}
              </pre>
            )}
            <p className="mt-3 text-[11px] text-[var(--color-ink-3)]">
              Honest status: challenge surface implemented; settlement
              verification is intentionally not claimed until wired to a real
              x402 facilitator.
            </p>
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-medium mb-3">Authorization boundary</h2>
            <div className="space-y-2">
              {LAYERS.map((l) => (
                <div
                  key={l.n}
                  className="flex gap-3 items-start p-2.5 rounded-lg border border-[var(--color-edge)]"
                >
                  <span className="w-6 h-6 rounded bg-[var(--color-panel-2)] grid place-items-center text-xs font-semibold text-[var(--color-accent)]">
                    {l.n}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-[var(--color-ink-3)]">
                      {l.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-sm font-medium mb-3">Task history</h2>
        <div className="space-y-1.5 text-xs mono">
          {(data?.tasks ?? []).map((t) => (
            <div key={t.task_id} className="flex gap-3 items-center">
              <span
                className={`chip ${t.status === "SUCCEEDED" ? "chip-pass" : "chip-fail"}`}
              >
                {t.status}
              </span>
              <span>{t.kind}</span>
              <span className="text-[var(--color-ink-3)]">{t.created_at}</span>
            </div>
          ))}
          {(!data?.tasks || data.tasks.length === 0) && (
            <p className="text-[var(--color-ink-3)]">
              {data
                ? "No tasks yet. Submit a bounded analysis to begin the history."
                : "Task history unavailable while identity loads."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[var(--color-ink-3)] w-24">{k}</span>
      <span>{v}</span>
    </div>
  );
}
