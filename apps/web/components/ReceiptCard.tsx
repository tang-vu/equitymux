"use client";

import type { Receipt } from "@/lib/api";

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const tx = (receipt.execution as { txHash?: string })?.txHash;
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Execution Receipt</h3>
        <span className="text-xs text-[var(--color-ink-3)]">Every execution should explain itself.</span>
      </div>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-xs mono">
        <Row k="receipt" v={receipt.receiptId} />
        <Row k="hash" v={receipt.receiptHash} accent />
        <Row k="state" v={receipt.state} />
        <Row k="constitution" v={receipt.policy.constitutionHash} />
        <Row k="intent" v={`${receipt.intent.side} $${receipt.intent.notional ?? "?"} ${receipt.intent.ticker}`} />
        <Row k="market" v={String(receipt.marketContext?.marketStatus ?? "n/a")} />
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
          className="text-xs px-3 py-1.5 rounded border border-[var(--color-edge)] hover:border-[var(--color-accent)]"
          onClick={() => {
            const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `equitymux-receipt-${receipt.receiptId}.json`;
            a.click();
          }}
        >
          download JSON
        </button>
        {tx && (
          <a className="text-xs px-3 py-1.5 rounded border border-[var(--color-edge)] hover:border-[var(--color-accent)]"
             href={`https://bscscan.com/tx/${tx}`} target="_blank">
            bscscan ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, accent, link }: { k: string; v: string; accent?: boolean; link?: string }) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="text-[var(--color-ink-3)] w-24 shrink-0">{k}</span>
      {link ? (
        <a href={link} target="_blank" className="text-[var(--color-info)] truncate">{v}</a>
      ) : (
        <span className={`truncate ${accent ? "text-[var(--color-accent)]" : ""}`}>{v}</span>
      )}
    </div>
  );
}
