"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Config, type Health } from "@/lib/api";

export default function DevPage() {
  const health = useQuery({ queryKey: ["health"], queryFn: () => api<Health>("/health") });
  const config = useQuery({ queryKey: ["config"], queryFn: () => api<Config>("/config") });
  const events = useQuery({ queryKey: ["dx"], queryFn: () => api<{ events: any[] }>("/dx/events?limit=100") });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Developer / API status</h1>
        <p className="text-sm text-[var(--color-ink-2)] mt-1">Internal diagnostics — never exposes secrets.</p>
      </header>

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
          <pre className="text-[11px] mono overflow-auto max-h-72 bg-[var(--color-bg)] rounded-lg p-3">
            {JSON.stringify(health.data ?? {}, null, 2)}
          </pre>
        </div>
        <div className="panel p-5">
          <h2 className="text-sm font-medium mb-3">Safety config (system ceilings)</h2>
          <pre className="text-[11px] mono overflow-auto max-h-72 bg-[var(--color-bg)] rounded-lg p-3">
            {JSON.stringify(config.data ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-sm font-medium mb-3">DX evidence — integration events (JSONL)</h2>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-[11px] mono">
            <thead>
              <tr className="text-left text-[var(--color-ink-3)] border-b border-[var(--color-edge)]">
                <th className="py-1.5 pr-3">time</th><th className="pr-3">module</th><th className="pr-3">endpoint</th>
                <th className="pr-3">http</th><th className="pr-3">code</th><th className="pr-3 text-right">ms</th><th>ok</th>
              </tr>
            </thead>
            <tbody>
              {(events.data?.events ?? []).slice().reverse().map((e, i) => (
                <tr key={i} className="border-b border-[var(--color-edge)]">
                  <td className="py-1.5 pr-3 text-[var(--color-ink-3)]">{String(e.timestamp).slice(11, 19)}</td>
                  <td className="pr-3">{e.module}</td>
                  <td className="pr-3 text-[var(--color-ink-2)] max-w-md truncate">{e.endpoint}</td>
                  <td className="pr-3">{e.httpStatus ?? "—"}</td>
                  <td className="pr-3">{e.businessCode ?? "—"}</td>
                  <td className="pr-3 text-right">{e.latencyMs ?? "—"}</td>
                  <td className={e.success ? "text-[var(--color-pass)]" : "text-[var(--color-fail)]"}>{e.success ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
