# System architecture

## Decision path

`UI / CLI / MCP / keeper task -> decisions -> graph -> Binance public APIs or
recorded fixtures -> normalized snapshot -> market-data policy -> receipt`

`decisions.py` supplies capture, analysis, receipt building, replay and what-if
comparison. `DecisionPolicy` validates explicit numeric bounds and rejects
unknown keys. Snapshot identity includes the actual representations; recorded
capture includes a digest of the source fixture corpus. Replays perform no I/O.

Normalization uses Decimal arithmetic: `share price = token price / shares per
token`. Eligible research candidates are ordered by displayed share price and a
stable contract-address tie breaker. Market cap and volume never stand in for
depth. Slippage is a requested future ceiling, not measured from a price feed.

Premium and absolute parity, issuer, market state, positive price and independent
reference checks gate the shortlist. Optional issuer-report and minimum-depth
requirements fail when unavailable. A shortlist is separate from execution
readiness; no result in this service can submit a trade.

## Execution path and release gate

The preserved pipeline runs discovery, wallet quotes and Portfolio Constitution
evaluation. System ceilings cannot be relaxed by that constitution. Recorded
mode never queries an authenticated wallet for quotes. The simulation stage now
returns SKIP/BLOCKED because the wallet adapter does not bind quoted calldata to
the later swap. The pipeline treats every non-PASS simulation as a stop.

Future execution must authenticate and bind human approval to a plan, establish
actual portfolio state, freshness, simulation and identical transaction input,
prevent replays, and verify chain receipt plus resulting position. The existing
`confirm` flag alone is not authentication. Public multi-user execution is not
supported.

The BSC read-only simulation primitive now includes sender/value and uses one
explicit block context. This fixes the primitive; it does not complete the swap
adapter. Wallet terminal status alone is not final onchain verification.

## Receipts and authority

Decision receipts are portable input/output bundles with a versioned engine.
SHA-256 canonicalization matches Python and TypeScript. Replay checks hash,
computed outcome and provenance label separately. A maliciously replaced source
snapshot can be self-consistent: replay does not authenticate upstream truth.

Execution receipts remain in SQLite for the original terminal. Decision bundles
are returned directly and downloaded by the user, without adding unbounded
public writes to the receipt archive. Keeper tasks retain their own history.

The Foundry receipt registry is a notary with no custody or routing authority.
An event establishes that a caller committed a hash, not that the alleged trade
occurred. Agent Studio signing stays outside the analysis tool surface.
