"use client";

import { WorkspaceIntro } from "@/components/WorkspaceIntro";

import { useQuery } from "@tanstack/react-query";
import { api, type Config, type DxEvent, type Health } from "@/lib/api";

export default function DevPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
  });
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => api<Config>("/config"),
  });
  const events = useQuery({
    queryKey: ["dx"],
    queryFn: () => api<{ events: DxEvent[] }>("/dx/events?limit=100"),
  });

  return (
    <div className="workspace-page space-y-6">
      <WorkspaceIntro
        index="07 / SYSTEM OBSERVATORY"
        title="Know what is connected."
        description="Check the API fingerprint, execution ceilings and diagnostic events. Missing responses remain unknown."
      ></WorkspaceIntro>

      {(health.error || config.error || events.error) && (
        <p role="alert" className="api-error">
          {(health.error || config.error || events.error)?.message}
        </p>
      )}
      <div className="diagnostic-facts">
        <div>
          <span>API fingerprint</span>
          <strong>{health.data?.service ?? "Unknown"}</strong>
        </div>
        <div>
          <span>Execution switch</span>
          <strong>
            {health.data
              ? health.data.executionEnabled
                ? "Enabled"
                : "Disabled"
              : "Unknown"}
          </strong>
        </div>
        <div>
          <span>Evidence mode</span>
          <strong>
            {health.data
              ? health.data.demoMode
                ? "RECORDED"
                : "LIVE"
              : "Unknown"}
          </strong>
        </div>
      </div>
      {health.data && health.data.service !== "equitymux-api" && (
        <div className="panel p-4 border-[var(--color-fail)] text-sm text-[var(--color-fail)]">
          Proxy warning: <code>/api/health</code> did not identify as{" "}
          <code>equitymux-api</code> — the dev proxy may be pointing at a
          different backend (check <code>EQUITYMUX_API</code>).
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="panel p-5">
          <h2 className="text-sm font-medium mb-3">Health</h2>
          <dl className="support-facts">
            <dt>Wallet adapter</dt>
            <dd>{health.data?.agenticWallet?.status ?? "Unknown"}</dd>
            <dt>BSC RPC</dt>
            <dd>
              {health.data?.bscRpc?.status ??
                (health.data?.bscRpc
                  ? health.data.bscRpc.ok
                    ? "Responding"
                    : "Unavailable"
                  : "Unknown")}
            </dd>
            <dt>Market feed</dt>
            <dd>{health.data?.binanceRwa?.marketStatus ?? "Unknown"}</dd>
          </dl>
          <details>
            <summary>Inspect response fields</summary>
            <pre className="text-[11px] mono overflow-auto max-h-72 bg-[var(--color-bg)] rounded-lg p-3">
              {JSON.stringify(health.data ?? {}, null, 2)}
            </pre>
          </details>
        </div>
        <div className="panel p-5">
          <h2 className="text-sm font-medium mb-3">
            Safety config (system ceilings)
          </h2>
          <dl className="support-facts">
            <dt>Notional ceiling</dt>
            <dd>
              {config.data
                ? "$" + config.data.maxMainnetNotionalUsd
                : "Unknown"}
            </dd>
            <dt>Premium ceiling</dt>
            <dd>
              {config.data ? config.data.maxPremiumBpsHard + " bps" : "Unknown"}
            </dd>
            <dt>Slippage ceiling</dt>
            <dd>
              {config.data
                ? config.data.maxSlippageBpsHard + " bps"
                : "Unknown"}
            </dd>
            <dt>Simulation required</dt>
            <dd>
              {config.data ? String(config.data.requireSimulation) : "Unknown"}
            </dd>
          </dl>
          <details>
            <summary>Inspect response fields</summary>
            <pre className="text-[11px] mono overflow-auto max-h-72 bg-[var(--color-bg)] rounded-lg p-3">
              {JSON.stringify(config.data ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      </div>

      <div className="panel p-5">
        {events.data?.events.length === 0 && (
          <p className="small-note">No diagnostic events recorded.</p>
        )}
        <h2 className="text-sm font-medium mb-3">
          DX evidence — integration events (JSONL)
        </h2>
        <div
          className="overflow-auto max-h-96"
          role="region"
          aria-label="Diagnostic events"
          tabIndex={0}
        >
          <table className="w-full min-w-[900px] text-[11px] mono">
            <thead>
              <tr className="text-left text-[var(--color-ink-3)] border-b border-[var(--color-edge)]">
                <th className="py-1.5 pr-3">time</th>
                <th className="pr-3">module</th>
                <th className="pr-3">endpoint</th>
                <th className="pr-3">http</th>
                <th className="pr-3">code</th>
                <th className="pr-3 text-right">ms</th>
                <th>ok</th>
              </tr>
            </thead>
            <tbody>
              {(events.data?.events ?? [])
                .slice()
                .reverse()
                .map((e, i) => (
                  <tr key={i} className="border-b border-[var(--color-edge)]">
                    <td className="py-1.5 pr-3 text-[var(--color-ink-3)]">
                      {String(e.timestamp).slice(11, 19)}
                    </td>
                    <td className="pr-3">{e.module}</td>
                    <td className="pr-3 text-[var(--color-ink-2)] max-w-md truncate">
                      {e.endpoint}
                    </td>
                    <td className="pr-3">{e.httpStatus ?? "—"}</td>
                    <td className="pr-3">{e.businessCode ?? "—"}</td>
                    <td className="pr-3 text-right">{e.latencyMs ?? "—"}</td>
                    <td
                      className={
                        e.success
                          ? "text-[var(--color-pass)]"
                          : "text-[var(--color-fail)]"
                      }
                    >
                      {e.success ? "✓" : "✗"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
