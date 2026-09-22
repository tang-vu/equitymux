import { formatNumber, type DecisionRoute } from "@/lib/decisions";

/** Shared symmetric scale makes both discounts and premiums visible. */
export function ParityMap({ routes }: { routes: DecisionRoute[] }) {
  const values = routes
    .flatMap((r) => (r.premiumBps == null ? [] : [Number(r.premiumBps)]))
    .filter(Number.isFinite);
  const bound = Math.max(10, ...values.map(Math.abs));
  return (
    <div
      className="panel p-5"
      role="img"
      aria-label="Provider parity comparison. Zero is the underlying reference; negative is a discount, positive is a premium."
    >
      <div className="flex justify-between gap-2 text-xs mb-5">
        <span className="eyebrow">SAME EXPOSURE / DIFFERENT PRICES</span>
        <span className="text-[var(--color-ink-2)]">
          Discount ← reference → premium
        </span>
      </div>
      <div className="space-y-4">
        {routes.map((r) => {
          const value = r.premiumBps == null ? null : Number(r.premiumBps);
          const x = value == null ? 50 : 50 + (value / bound) * 45;
          return (
            <div
              key={r.tokenAddress}
              className="grid grid-cols-[65px_1fr_80px] items-center gap-3 text-xs"
            >
              <span>{r.symbol}</span>
              <div className="relative h-5 border-b border-[var(--color-edge)]">
                <span className="absolute left-1/2 h-5 border-l border-dashed border-[var(--color-ink-3)]" />
                {value != null && (
                  <>
                    <span
                      className="absolute top-2 h-1 bg-[var(--color-ink-3)]"
                      style={{
                        left: `${Math.min(50, x)}%`,
                        width: `${Math.abs(x - 50)}%`,
                      }}
                    />
                    <span
                      className={`absolute top-1 w-3 h-3 rounded-full -translate-x-1/2 ${r.status === "REJECTED" ? "bg-[var(--color-fail)]" : "bg-[var(--color-pass)]"}`}
                      style={{ left: `${x}%` }}
                    />
                  </>
                )}
              </div>
              <span className="mono text-right">
                {formatNumber(r.premiumBps, 1)} bps
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-[var(--color-ink-3)] mt-4">
        Displayed parity, not executable spread. Each route retains its
        reference source. Red indicates a policy rejection.
      </p>
    </div>
  );
}
