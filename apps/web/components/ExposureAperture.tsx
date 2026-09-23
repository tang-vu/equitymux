"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { formatNumber as fmt, type DecisionReceipt } from "@/lib/decisions";

gsap.registerPlugin(ScrollTrigger);

const names: Record<string, string> = {
  ondo: "Ondo",
  xstocks: "xStocks",
  bstock: "bStocks",
};
const chapters = ["Observe", "Normalize", "Apply policy", "Keep evidence"];
const stops = [0.08, 0.35, 0.65, 1];

export function ExposureAperture({
  receipt,
  inspected,
  onInspect,
  onChapterChange,
}: {
  receipt: DecisionReceipt;
  inspected: string | null;
  onInspect: (address: string) => void;
  onChapterChange: (chapter: number) => void;
}) {
  const passage = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const previous = useRef(receipt);
  const [chapter, setChapter] = useState(0);
  const routes = receipt.decision.routes;

  useEffect(() => {
    if (
      !passage.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const root = passage.current;
    const context = gsap.context(() => {
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "power2.inOut" },
      });
      timeline.current = tl;
      tl.set(".aperture-plate", {
        rotateX: 57,
        rotateZ: -18,
        scale: 1.32,
        y: 30,
      })
        .set(".aperture-object", {
          rotateY: -34,
          rotateZ: -11,
          z: -90,
          x: 0,
          y: 0,
          opacity: 0,
        })
        .set(".aperture-shutter", { scaleX: 0, transformOrigin: "left center" })
        .set(".aperture-layer", { opacity: 0, y: 70, rotateX: 32 })
        .to(
          ".aperture-plate",
          { rotateX: 43, rotateZ: -9, scale: 1, y: 0, duration: 0.16 },
          0,
        )
        .to(
          ".aperture-object",
          {
            opacity: 1,
            z: 0,
            x: (i: number) => (i - 1) * 18,
            y: (i: number) => (i - 1) * 13,
            duration: 0.18,
            stagger: 0.025,
          },
          0.02,
        )
        .to(
          ".aperture-plate",
          { rotateX: 12, rotateZ: 0, scale: 0.94, duration: 0.27 },
          0.2,
        )
        .to(
          ".aperture-object",
          {
            rotateY: 0,
            rotateZ: 0,
            x: 0,
            y: 0,
            z: 20,
            duration: 0.27,
            stagger: 0.025,
          },
          0.2,
        )
        .to(
          ".aperture-object",
          { x: (i: number) => (i - 1) * 9, z: 0, duration: 0.18 },
          0.5,
        )
        .to(
          ".aperture-shutter",
          { scaleX: 1, duration: 0.2, stagger: 0.025 },
          0.52,
        )
        .to(
          ".aperture-object[data-rejected='true']",
          { x: 38, z: -32, rotateY: -18, opacity: 0.66, duration: 0.22 },
          0.62,
        )
        .to(
          ".aperture-plate",
          { rotateX: 25, rotateZ: 5, y: -10, duration: 0.25 },
          0.77,
        )
        .to(
          ".aperture-object",
          { y: (i: number) => i * -15, duration: 0.2 },
          0.8,
        )
        .to(
          ".aperture-layer",
          { opacity: 1, y: 0, rotateX: 0, duration: 0.16, stagger: 0.035 },
          0.82,
        );
      tl.progress(0);
      ScrollTrigger.create({
        trigger: root,
        start: "top 95%",
        once: true,
        onEnter: () =>
          gsap.to(tl, { progress: 0.2, duration: 1.8, ease: "power3.out" }),
      });
      if (window.matchMedia("(min-width: 801px)").matches)
        ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.45,
          onUpdate: (self) => {
            tl.progress(self.progress);
            const next =
              self.progress < 0.2
                ? 0
                : self.progress < 0.5
                  ? 1
                  : self.progress < 0.8
                    ? 2
                    : 3;
            setChapter(next);
            onChapterChange(next);
          },
        });
    }, root);
    return () => {
      timeline.current = null;
      context.revert();
    };
  }, [receipt.intent.ticker, routes.length, onChapterChange]);

  useEffect(() => {
    const prior = previous.current;
    previous.current = receipt;
    if (
      !passage.current ||
      prior.receiptHash === receipt.receiptHash ||
      prior.snapshot.source_digest !== receipt.snapshot.source_digest ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const root = passage.current;
    const tween = gsap.timeline();
    tween
      .to(root.querySelectorAll(".aperture-shutter"), {
        scaleX: 1,
        duration: 0.36,
        stagger: 0.08,
        ease: "power2.in",
      })
      .to(
        root.querySelectorAll(".aperture-object[data-rejected='true']"),
        {
          x: 38,
          z: -32,
          rotateY: -18,
          opacity: 0.66,
          duration: 0.55,
          ease: "power3.out",
        },
        0.55,
      )
      .to(
        root.querySelectorAll(".aperture-shutter"),
        { scaleX: 0.15, duration: 0.3 },
        1.12,
      );
    return () => {
      tween.kill();
    };
  }, [receipt]);

  function seek(index: number) {
    setChapter(index);
    onChapterChange(index);
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !passage.current
    )
      return;
    if (window.matchMedia("(max-width: 800px)").matches) {
      gsap.to(timeline.current, { progress: stops[index], duration: 0.7 });
      return;
    }
    const max = passage.current.offsetHeight - window.innerHeight;
    window.scrollTo({
      top:
        passage.current.getBoundingClientRect().top +
        window.scrollY +
        max * stops[index],
      behavior: "smooth",
    });
    timeline.current?.tweenTo(stops[index], { duration: 0.7 });
  }

  return (
    <div
      ref={passage}
      className="aperture-passage"
      data-chapter={chapter}
      aria-label="Exposure aperture motion scene"
    >
      <div className="aperture-stage">
        <div className="aperture-head">
          <span className="label">
            EXPOSURE APERTURE / {receipt.intent.ticker}
          </span>
          <span className="label">
            {receipt.dataLabel} · {receipt.decision.execution.status}
          </span>
        </div>
        <div className="aperture-camera" aria-hidden="true">
          <div className="aperture-plate">
            <div className="plate-grain" />
            <span className="plate-identity">{receipt.intent.ticker}</span>
            <span className="plate-caption">
              UNDERLYING IDENTITY / ONE COMPANY
            </span>
            <div className="plate-rail rail-a" />
            <div className="plate-rail rail-b" />
            <div className="plate-rail rail-c" />
          </div>
        </div>
        <div className="aperture-lanes">
          {routes.map((r, i) => (
            <button
              key={r.tokenAddress}
              className="aperture-object"
              data-rejected={r.status === "REJECTED"}
              data-address={r.tokenAddress}
              data-issuer={r.platform}
              aria-pressed={inspected === r.tokenAddress}
              aria-label={`Inspect ${r.symbol} in aperture`}
              onClick={() => onInspect(r.tokenAddress)}
            >
              <span className="object-edge" />
              <span className="object-face">
                <span className="object-top">
                  <span>
                    0{i + 1} / {names[r.platform] ?? r.platform}
                  </span>
                  <span>↗</span>
                </span>
                <strong>{r.symbol}</strong>
                <span className="object-price">
                  {r.tokenPriceUsd == null
                    ? "Unknown"
                    : "$" + fmt(r.tokenPriceUsd, 4)}{" "}
                  <small>/ token</small>
                </span>
                <span className="object-multiplier">
                  ÷ {fmt(r.sharesPerToken, 6)} shares / token
                </span>
                <span className="object-result">
                  {r.sharePriceUsd == null
                    ? "Unknown"
                    : "$" + fmt(r.sharePriceUsd)}{" "}
                  <small>USD / share</small>
                </span>
                <span className="object-check">
                  {r.status === "REJECTED"
                    ? `REJECTED · ${r.blockers[0] ?? "Policy check failed"}`
                    : "SHORTLISTED · observed checks passed"}
                </span>
              </span>
              <span className="aperture-shutter" />
            </button>
          ))}
        </div>
        <div className="aperture-evidence" aria-hidden="true">
          <span className="aperture-layer">SNAPSHOT</span>
          <span className="aperture-layer">APPLIED POLICY</span>
          <span className="aperture-layer">ALTERNATIVES</span>
        </div>
        <div className="aperture-controls">
          <div className="chapter-buttons" aria-label="Normalization chapters">
            {chapters.map((name, i) => (
              <button
                key={name}
                aria-pressed={chapter === i}
                onClick={() => seek(i)}
              >
                {String(i + 1).padStart(2, "0")} / {name}
              </button>
            ))}
          </div>
          <a href="#research-verdict" className="aperture-desk-link">
            Open decision desk ↗
          </a>
        </div>
        <p className="aperture-cue">
          ↓ Scroll to follow the same issuer objects through the decision
        </p>
      </div>
    </div>
  );
}
