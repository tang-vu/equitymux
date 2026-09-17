"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, type Health } from "@/lib/api";

const LINKS = [
  { href: "/", label: "Terminal" },
  { href: "/constitution", label: "Constitution" },
  { href: "/explorer", label: "Explorer" },
  { href: "/routes", label: "Routes" },
  { href: "/receipts", label: "Receipts" },
  { href: "/agent", label: "Agent Ops" },
  { href: "/dev", label: "Dev" },
];

export function Nav() {
  const path = usePathname();
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
    refetchInterval: 30_000,
  });
  const live = !health?.demoMode;
  return (
    <header className="border-b border-[var(--color-edge)] mb-8">
      <div className="mx-auto max-w-7xl px-5 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[var(--color-accent)] grid place-items-center text-[var(--color-accent-ink)] font-bold text-xs">EM</div>
          <span className="font-semibold tracking-tight">EquityMux</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                path === l.href ? "text-ink bg-panel-2" : "text-[var(--color-ink-2)] hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {health && (
            <>
              <span className="chip chip-info">BSC · 56</span>
              <span className={`chip ${live ? "chip-pass" : "chip-warn"}`}>
                <span className={`dot ${live ? "dot-live" : "dot-rec"}`} />
                {live ? "LIVE" : "RECORDED"}
              </span>
              {health.binanceRwa?.marketStatus && (
                <span className="chip">{health.binanceRwa.marketStatus}</span>
              )}
              <span className={`chip ${health.agenticWallet?.status === "CONNECTED" ? "chip-pass" : ""}`}>
                wallet: {health.agenticWallet?.status ?? "n/a"}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
