# The exposure desk

EquityMux uses the visual language of an investment research desk: warm paper,
forest ink, editorial headings and a compact issuer ledger. The first screen
answers four questions: which equity, which wrappers, which price and which
policy result. A single dark verdict memo establishes the next reading step.

Source Sans 3 and Source Serif 4 are self-hosted under the SIL Open Font License;
the interface does not depend on a font CDN. Numeric columns use tabular figures.
Color is reinforced with text and icons. Keyboard focus, a skip link, native
disclosures, labelled inputs and reduced-motion preferences are supported.

The desk loads a clearly labelled recorded NVIDIA analysis immediately. Choosing
Apple or Tesla runs the same deterministic workflow. Opening an issuer row
reveals normalization, policy checks and source evidence instead of hiding those
details behind a separate page. On narrow screens the ledger becomes labelled
issuer rows, with the verdict before the policy editor.

The parity graphic is derived from receipt data, not an invented price history.
Unknown executable depth stays visibly unverified. The policy challenge changes
only policy against the same market snapshot; restore returns to the user's
actual baseline. The receipt remains available while a new request is loading
or fails. Browser hashing and server replay independently check the final record.

The Workspace menu keeps advanced tools accessible without overwhelming the
primary research flow. Escape closes it and restores focus. Execution remains
locked; this design does not imply a live trade or verified issuer backing.

Run `pnpm test:e2e` to build the production app and exercise the judge journey,
mobile layout, keyboard evidence inspection and custom-policy restoration.
`EQUITYMUX_E2E_API_PORT` and `EQUITYMUX_E2E_WEB_PORT` allow isolated test servers
alongside an existing preview. Screenshots are generated in `docs/demo/`.
