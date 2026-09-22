import { formatNumber as fmt, type DecisionRoute } from "@/lib/decisions";

export function ParityMap({
  routes,
  dispersion,
  inspected,
  onInspect,
}: {
  routes: DecisionRoute[];
  dispersion: string | null;
  inspected: string | null;
  onInspect: (address: string) => void;
}) {
  const values = routes
    .flatMap((r) => (r.premiumBps == null ? [] : [Number(r.premiumBps)]))
    .filter(Number.isFinite);
  const bound = Math.max(10, ...values.map(Math.abs));
  return (
    <section className="parity-study" aria-label="Provider parity study">
      <div className="parity-heading">
        <div>
          <h3>The price of fragmentation.</h3>
          <p>Issuer wrappers can tell different stories.</p>
        </div>
        <div className="dispersion-number">
          {fmt(dispersion, 1)}
          <span>bps</span>
          <small>displayed price dispersion</small>
        </div>
      </div>
      <div
        role="group"
        aria-label="Provider parity comparison. Negative values are discounts, positive values are premiums to each underlying reference."
      >
        {routes.map((r) => {
          const value = r.premiumBps == null ? null : Number(r.premiumBps);
          const x = value == null ? 50 : 50 + (value / bound) * 45;
          return (
            <div key={r.tokenAddress} className="parity-row">
              <button
                className="parity-row-name"
                aria-pressed={inspected === r.tokenAddress}
                onClick={() => onInspect(r.tokenAddress)}
              >
                {r.symbol}
              </button>
              <div className="parity-track">
                <span className="parity-zero" />
                {value != null && (
                  <>
                    <span
                      className="parity-line"
                      style={{
                        left: Math.min(50, x) + "%",
                        width: Math.abs(x - 50) + "%",
                      }}
                    />
                    <span
                      className={
                        "parity-dot " +
                        (r.status === "REJECTED" ? "is-rejected" : "is-passing")
                      }
                      style={{ left: x + "%" }}
                    />
                  </>
                )}
              </div>
              <span className="parity-row-value">
                {fmt(r.premiumBps, 1)} bps
                <small>
                  {r.referenceSource ?? "Unknown basis"} ?{" "}
                  {r.referencePriceUsd == null
                    ? "Unknown"
                    : "$" + fmt(r.referencePriceUsd)}
                </small>
              </span>
            </div>
          );
        })}
        <div className="parity-axis">
          <span>?{fmt(String(bound), 1)} bps</span>
          <span>0</span>
          <span>+{fmt(String(bound), 1)} bps</span>
        </div>
      </div>
      <p className="parity-caption">
        Horizontal axis: deviation in basis points from each named reference.
        Negative is discount; positive is premium. Coral indicates a policy
        rejection. This is price parity, not executable spread.
      </p>
    </section>
  );
}
