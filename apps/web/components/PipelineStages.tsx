import type { RunResult } from "@/lib/api";

const ORDER = [
  "INTENT_RECEIVED", "INTENT_COMPILED", "DISCOVERING", "QUOTING",
  "POLICY_EVALUATION", "SIMULATING", "AWAITING_CONFIRMATION", "READY",
  "EXECUTING", "PENDING_CONFIRMATION", "CONFIRMED",
];

const LABEL: Record<string, string> = {
  INTENT_RECEIVED: "Intent", INTENT_COMPILED: "Compiled", DISCOVERING: "Representations",
  QUOTING: "Quotes", POLICY_EVALUATION: "Policy", SIMULATING: "Simulation",
  AWAITING_CONFIRMATION: "Authorization", READY: "Ready", EXECUTING: "Execution",
  PENDING_CONFIRMATION: "On-chain", CONFIRMED: "Confirmed",
  NO_VALID_ROUTE: "No valid route", SIMULATION_FAILED: "Sim failed",
  EXECUTION_FAILED: "Failed", POLICY_REJECTED: "Rejected",
};

export function PipelineStages({ transitions, state }: {
  transitions: RunResult["receipt"]["transitions"];
  state: string;
}) {
  const visited = new Set(transitions.map((t) => t.state));
  const failed = ["SIMULATION_FAILED", "EXECUTION_FAILED", "POLICY_REJECTED", "NO_VALID_ROUTE"].includes(state);
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-1 overflow-x-auto">
        {ORDER.map((s, i) => {
          const seen = visited.has(s);
          const isFinal = s === state || (s === "AWAITING_CONFIRMATION" && state === "AWAITING_CONFIRMATION");
          return (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${
                seen ? "bg-[var(--color-panel-2)] text-ink" : "text-[var(--color-ink-3)]"
              } ${isFinal && !failed ? "border border-[var(--color-accent)]" : ""}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${seen ? "bg-[var(--color-pass)]" : "bg-[var(--color-edge)]"}`} />
                {LABEL[s] ?? s}
              </div>
              {i < ORDER.length - 1 && <span className="text-[var(--color-edge)]">→</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-[var(--color-ink-2)] flex items-center gap-2">
        final state:
        <span className={`chip ${failed ? "chip-fail" : state === "CONFIRMED" ? "chip-pass" : "chip-warn"}`}>
          {state}
        </span>
        <span className="text-[var(--color-ink-3)]">
          {transitions.length} transitions recorded in receipt
        </span>
      </div>
    </div>
  );
}
