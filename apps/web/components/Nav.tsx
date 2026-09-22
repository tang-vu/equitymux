"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { api, type Health } from "@/lib/api";

const MAIN = [
  { href: "/", label: "Research desk" },
  { href: "/explorer", label: "Asset universe" },
  { href: "/agent", label: "Agent tools" },
];
const TOOLS = [
  { href: "/constitution", label: "Portfolio constitution" },
  { href: "/terminal", label: "Execution terminal" },
  { href: "/routes", label: "Route inspector" },
  { href: "/receipts", label: "Receipt archive" },
  { href: "/dev", label: "Developer API" },
];

export function Nav() {
  const path = usePathname();
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
    refetchInterval: 30_000,
  });
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="EquityMux home">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M3 7h10l7 9h9M3 16h26M3 25h10l7-9"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="square"
            />
            <path d="m24 11 5 5-5 5" stroke="currentColor" strokeWidth="2.4" />
          </svg>
          <span>equitymux</span>
        </Link>
        <nav aria-label="Main navigation" className="main-navigation">
          {MAIN.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={path === l.href ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="header-network">
          <span className="network-mark" />
          BNB Smart Chain
        </span>
        <details
          className="workspace-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.removeAttribute("open");
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary>
            Workspace <ChevronDown size={13} />
          </summary>
          <div className="workspace-dropdown">
            <nav aria-label="Workspace tools">
              {TOOLS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={path === l.href ? "page" : undefined}
                  onClick={(e) =>
                    e.currentTarget.closest("details")?.removeAttribute("open")
                  }
                >
                  {l.label}
                  <ArrowUpRight size={13} />
                </Link>
              ))}
            </nav>
            <p className="workspace-status">
              {!health
                ? "Checking service…"
                : health.agenticWallet?.status === "CONNECTED"
                  ? "Wallet connected · execution gated"
                  : "Read-only workspace · no wallet required"}
            </p>
          </div>
        </details>
      </div>
    </header>
  );
}
