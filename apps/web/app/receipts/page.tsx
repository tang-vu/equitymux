"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Receipt } from "@/lib/api";
import { ReceiptCard } from "@/components/ReceiptCard";

export default function ReceiptsPage() {
  const { data } = useQuery({ queryKey: ["receipts"], queryFn: () => api<{ receipts: any[] }>("/receipts") });
  const [sel, setSel] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["receipt", sel],
    queryFn: () => api<Receipt>(`/receipts/${sel}`),
    enabled: !!sel,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Receipts</h1>
        <p className="text-sm text-[var(--color-ink-2)] mt-1">Every execution should explain itself — hash-verifiable, replayable.</p>
      </header>
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 panel p-4">
          {data?.receipts?.length === 0 && <p className="text-sm text-[var(--color-ink-3)]">No receipts yet. Run an intent from the Terminal.</p>}
          <div className="space-y-1.5">
            {data?.receipts?.map((r) => (
              <button key={r.receipt_id}
                onClick={() => setSel(r.receipt_id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                  sel === r.receipt_id ? "border-[var(--color-accent)] bg-[var(--color-panel-2)]" : "border-[var(--color-edge)] hover:border-[var(--color-ink-3)]"
                }`}>
                <div className="flex justify-between">
                  <span className="mono">{r.receipt_id.slice(0, 12)}…</span>
                  <span className={`chip ${
                    r.state === "CONFIRMED" ? "chip-pass" :
                    ["NO_VALID_ROUTE", "SIMULATION_FAILED", "EXECUTION_FAILED", "POLICY_REJECTED"].includes(r.state) ? "chip-fail" : "chip-warn"
                  }`}>{r.state}</span>
                </div>
                <div className="text-[var(--color-ink-3)] mt-1">{r.created_at}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3">
          {detail.data ? <ReceiptCard receipt={detail.data} /> : (
            <div className="panel p-8 text-sm text-[var(--color-ink-3)] text-center">Select a receipt</div>
          )}
        </div>
      </div>
    </div>
  );
}
