"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, Check, Download, Fingerprint } from "lucide-react";
import { formatNumber as fmt, type DecisionReceipt } from "@/lib/decisions";

gsap.registerPlugin(ScrollTrigger);

export function DecisionRecord({
  receipt,
  busy,
  proof,
  verify,
  download,
  lanes,
}: {
  receipt: DecisionReceipt;
  busy: boolean;
  proof: string;
  verify: () => void;
  download: () => void;
  lanes: [
    "idle" | "pending" | "pass" | "fail",
    "idle" | "pending" | "pass" | "fail",
    "idle" | "pending" | "pass" | "fail",
  ];
}) {
  const scene = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      !scene.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const context = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(
        ".record-plane",
        { y: 90, rotateX: 25, opacity: 0 },
        {
          y: 0,
          rotateX: 0,
          opacity: 1,
          duration: 1.1,
          stagger: 0.12,
          ease: "power3.out",
        },
      )
        .fromTo(
          ".receipt-paper",
          { y: 55, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" },
          0.55,
        )
        .fromTo(
          ".receipt-hash code",
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 0.6 },
          1,
        );
      ScrollTrigger.create({
        trigger: scene.current,
        start: "top 80%",
        once: true,
        onEnter: () => tl.play(),
      });
    }, scene);
    return () => context.revert();
  }, [receipt.receiptHash]);
  const decision = receipt.decision;
  const ticker = receipt.intent.ticker;
  const passing = decision.routes.filter(
    (r) => r.status === "SHORTLISTED",
  ).length;
  return (
    <section
      ref={scene}
      className="decision-record"
      aria-label="Decision receipt"
    >
      <div className="record-intro">
        <span className="label">THE PAPER TRAIL</span>
        <h2>
          A decision you can
          <br />
          <em>account for.</em>
        </h2>
        <p>
          Snapshot, policy and every alternative, together in one portable
          record.
        </p>
        <a
          href="#receipt-actions"
          className="record-anchor"
          aria-label="Go to receipt verification"
        >
          <ArrowDown size={19} />
        </a>
      </div>
      <div className="record-assembly" aria-hidden="true">
        <span className="record-plane">
          01 / SNAPSHOT
          <br />
          {ticker}
        </span>
        <span className="record-plane">
          02 / APPLIED POLICY
          <br />
          {receipt.policy.max_premium_bps} BPS
        </span>
        <span className="record-plane">
          03 / ALTERNATIVES
          <br />
          {decision.routes.length} ROUTES
        </span>
      </div>
      <div className="receipt-paper">
        <div className="receipt-topline">
          <span className="receipt-wordmark">equitymux / decision record</span>
          <span className="label">{receipt.dataLabel}</span>
        </div>
        <div className="receipt-facts">
          <div>
            <span>Underlying</span>
            <strong>{ticker}</strong>
          </div>
          <div>
            <span>Policy outcome</span>
            <strong>
              {passing} of {decision!.routes.length} shortlisted
            </strong>
          </div>
          <div>
            <span>Execution</span>
            <strong>{decision!.execution.status}</strong>
          </div>
        </div>
        <details className="record-contents">
          <summary>Snapshot, applied policy & alternatives</summary>
          <p>
            Snapshot digest:{" "}
            <code>{receipt.snapshot.source_digest ?? "Unknown"}</code>
          </p>
          <p>
            Reference observation time: Unknown. Retrieval is not freshness.
          </p>
          <p>
            Premium cap: {receipt.policy.max_premium_bps} bps / Minimum depth: $
            {fmt(receipt.policy.min_liquidity_usd)}
          </p>
          {decision!.routes.map((r) => (
            <p key={r.tokenAddress}>
              <strong>{r.symbol}</strong> / {fmt(r.sharePriceUsd)} USD/share /{" "}
              {r.status}
              <br />
              {r.blockers.length
                ? r.blockers.join(" / ")
                : "All observed policy checks passed"}
            </p>
          ))}
        </details>
        <div className="receipt-hash">
          <Fingerprint size={20} />
          <div>
            <span className="label">SHA-256 / CANONICAL RECEIPT</span>
            <code>{receipt.receiptHash}</code>
          </div>
        </div>
        <div className="receipt-actions" id="receipt-actions">
          <button className="primary-action" disabled={busy} onClick={verify}>
            <Check size={15} />
            Verify & replay
          </button>
          <button className="text-action" disabled={busy} onClick={download}>
            <Download size={15} />
            Download receipt
          </button>
        </div>
        {!proof && (
          <p className="verification-idle">
            Not verified / Browser integrity, decision replay and provenance
            consistency await checking.
          </p>
        )}
        {proof && (
          <p
            className={
              "verification-result " +
              (proof.startsWith("MATCH")
                ? "verification-pass"
                : "verification-fail")
            }
            role="status"
          >
            {proof}
          </p>
        )}
        <div className="verification-lanes" aria-label="Verification checks">
          {(
            [
              "Browser integrity",
              "Server replay",
              "Provenance consistency",
            ] as const
          ).map((name, i) => (
            <div key={name} data-status={lanes[i]}>
              <span>
                {String(i + 1).padStart(2, "0")} / {name}
              </span>
              <strong>
                {lanes[i] === "pass"
                  ? "✓ VERIFIED"
                  : lanes[i] === "fail"
                    ? "FAILED · RETRY"
                    : lanes[i] === "pending"
                      ? "CHECKING"
                      : "AWAITING CHECK"}
              </strong>
            </div>
          ))}
        </div>
        <p className="receipt-disclaimer">
          Replay proves internal consistency. It does not authenticate the
          source, verify backing, or prove an onchain trade.
        </p>
      </div>
    </section>
  );
}
