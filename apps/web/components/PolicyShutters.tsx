"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { formatNumber as fmt, type DecisionReceipt } from "@/lib/decisions";

export function PolicyShutters({
  receipt,
  busy,
}: {
  receipt: DecisionReceipt;
  busy: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const previous = useRef(receipt);

  useEffect(() => {
    const prior = previous.current;
    previous.current = receipt;
    if (
      !scene.current ||
      prior.receiptHash === receipt.receiptHash ||
      prior.snapshot.source_digest !== receipt.snapshot.source_digest ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const root = scene.current;
    const motion = gsap.timeline();
    motion
      .fromTo(
        root.querySelectorAll(".policy-shutter"),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4, stagger: 0.08, ease: "power2.in" },
      )
      .fromTo(
        root.querySelectorAll(".policy-lane[data-rejected='true']"),
        { x: 0, opacity: 1 },
        { x: 18, opacity: 0.65, duration: 0.55, ease: "power3.out" },
        0.5,
      )
      .to(
        root.querySelectorAll(".policy-shutter"),
        { scaleX: 0.12, duration: 0.35 },
        1.18,
      );
    return () => {
      motion.kill();
    };
  }, [receipt]);

  return (
    <div
      ref={scene}
      className="policy-shutter-scene"
      aria-label="Same snapshot through applied policy"
      aria-busy={busy}
    >
      <div className="policy-scene-heading">
        <span>SNAPSHOT FROZEN / {receipt.intent.ticker}</span>
        <span>
          {busy
            ? "COMPARISON PENDING · PREVIOUS EVIDENCE"
            : `DEPTH RULE / $${fmt(receipt.policy.min_liquidity_usd, 0)}`}
        </span>
      </div>
      <div className="policy-lanes">
        {receipt.decision.routes.map((route) => (
          <div
            key={route.tokenAddress}
            className="policy-lane"
            data-address={route.tokenAddress}
            data-rejected={route.status === "REJECTED"}
            data-issuer={route.platform}
          >
            <span className="policy-shutter" />
            <strong>{route.symbol}</strong>
            <span>
              {route.sharePriceUsd == null
                ? "Unknown"
                : `$${fmt(route.sharePriceUsd)} / share`}
            </span>
            <small>
              {route.status === "REJECTED"
                ? (route.blockers[0] ?? "Policy check failed")
                : "SHORTLISTED"}
            </small>
          </div>
        ))}
      </div>
      <div className="policy-scene-foot">
        <span>
          EXECUTABLE DEPTH / UNKNOWN
          {Number(receipt.policy.min_liquidity_usd) > 0
            ? " · REQUIRED MINIMUM UNAVAILABLE"
            : ""}
        </span>
        <strong>{receipt.decision.state}</strong>
      </div>
    </div>
  );
}
