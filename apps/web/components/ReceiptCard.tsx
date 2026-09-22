"use client";

import { useState } from "react";
import { api, type Receipt } from "@/lib/api";
import { verifyReceiptHash } from "@/lib/canonical";

type VerifyState =
  | { status: "idle" }
  | { status: "running" }
  | {
      status: "done";
      clientMatch: boolean;
      serverMatch: boolean | null;
      recomputed: string;
    };

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const tx = (receipt.execution as { txHash?: string })?.txHash;
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });

  async function runVerify() {
    setVerify({ status: "running" });
    const client = await verifyReceiptHash(
      receipt as unknown as Record<string, unknown>,
    );
    let serverMatch: boolean | null = null;
    try {
      const s = await api<{ match: boolean }>(
        `/receipts/${receipt.receiptId}/verify`,
      );
      serverMatch = s.match;
    } catch {
      serverMatch = null;
    }
    setVerify({
      status: "done",
      clientMatch: client.ok ? client.match : false,
      serverMatch,
      recomputed: client.ok ? client.recomputed : "",
    });
  }
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Execution Receipt</h3>
        <span className="text-xs text-[var(--color-ink-3)]">
          Every execution should explain itself.
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-xs mono">
        <Row k="receipt" v={receipt.receiptId} />
        <Row k="hash" v={receipt.receiptHash} accent />
        <Row k="state" v={receipt.state} />
        <Row k="data" v={receipt.dataLabel ?? "LIVE"} />
        <Row k="constitution" v={receipt.policy.constitutionHash} />
        <Row
          k="intent"
          v={`${receipt.intent.side} $${receipt.intent.notional ?? "?"} ${receipt.intent.ticker}`}
        />
        <Row
          k="market"
          v={String(receipt.marketContext?.marketStatus ?? "n/a")}
        />
        {tx && <Row k="tx" v={tx} link={`https://bscscan.com/tx/${tx}`} />}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="text-xs px-3 py-1.5 rounded border border-[var(--color-edge)] hover:border-[var(--color-accent)]"
          onClick={() => navigator.clipboard.writeText(receipt.receiptHash)}
        >
          copy hash
        </button>
        <button
          className="text-xs px-3 py-1.5 rounded border border-[var(--color-edge)] hover:border-[var(--color-accent)] disabled:opacity-50"
          disabled={verify.status === "running"}
          onClick={runVerify}
        >
          {verify.status === "running" ? "verifying…" : "verify hash"}
        </button>
        <button
          className="text-xs px-3 py-1.5 rounded border border-[var(--color-edge)] hover:border-[var(--color-accent)]"
          onClick={() => {
            const blob = new Blob([JSON.stringify(receipt, null, 2)], {
              type: "application/json",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `equitymux-receipt-${receipt.receiptId}.json`;
            a.click();
          }}
        >
          download JSON
        </button>
        {tx && (
          <a
            className="text-xs px-3 py-1.5 rounded border border-[var(--color-edge)] hover:border-[var(--color-accent)]"
            href={`https://bscscan.com/tx/${tx}`}
            target="_blank"
          >
            bscscan ↗
          </a>
        )}
      </div>
      {verify.status === "done" && (
        <div className="mt-3 text-xs mono space-y-1 border-t border-[var(--color-edge)] pt-3">
          <div className="flex gap-2">
            <span className="text-[var(--color-ink-3)] w-24 shrink-0">
              client sha256
            </span>
            <span
              className={
                verify.clientMatch
                  ? "text-[var(--color-pass)]"
                  : "text-[var(--color-fail)]"
              }
            >
              {verify.clientMatch ? "MATCH" : "MISMATCH"} — recomputed{" "}
              {verify.recomputed.slice(0, 18)}…
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-[var(--color-ink-3)] w-24 shrink-0">
              server verify
            </span>
            <span
              className={
                verify.serverMatch === null
                  ? "text-[var(--color-ink-3)]"
                  : verify.serverMatch
                    ? "text-[var(--color-pass)]"
                    : "text-[var(--color-fail)]"
              }
            >
              {verify.serverMatch === null
                ? "unavailable"
                : verify.serverMatch
                  ? "MATCH"
                  : "MISMATCH"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  k,
  v,
  accent,
  link,
}: {
  k: string;
  v: string;
  accent?: boolean;
  link?: string;
}) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="text-[var(--color-ink-3)] w-24 shrink-0">{k}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          className="text-[var(--color-info)] truncate"
        >
          {v}
        </a>
      ) : (
        <span
          className={`truncate ${accent ? "text-[var(--color-accent)]" : ""}`}
        >
          {v}
        </span>
      )}
    </div>
  );
}
