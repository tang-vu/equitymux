/**
 * Canonical JSON — byte-exact parity with the Python backend:
 *   json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
 * Used for receipt-hash verification in the browser (Web Crypto sha256).
 */

const NON_ASCII = /[\u0080-\uffff]/g;

function escStr(s: string): string {
  // JSON.stringify handles quotes/controls; ensure_ascii additionally escapes
  // every code point > 0x7f as \uXXXX (surrogate pairs escape per unit, which
  // regex iteration over UTF-16 code units reproduces exactly).
  return JSON.stringify(s).replace(
    NON_ASCII,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

function ser(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return escStr(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "null";
    // Python renders integral floats without exponent differences for our data;
    // receipts only carry ints/strings/bools so JSON.stringify suffices.
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return "[" + v.map(ser).join(",") + "]";
  const o = v as Record<string, unknown>;
  return (
    "{" +
    Object.keys(o)
      .sort()
      .map((k) => escStr(k) + ":" + ser(o[k]))
      .join(",") +
    "}"
  );
}

export function canonicalJson(v: unknown): string {
  return ser(v);
}

/** receipt hash: sha256 over canonical JSON with receiptHash fields excluded. */
export function receiptBody(receipt: Record<string, unknown>): Record<string, unknown> {
  const { receiptHash: _a, receipt_hash: _b, ...rest } = receipt;
  return rest;
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return "0x" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyReceiptHash(receipt: Record<string, unknown>) {
  const claimed = (receipt.receiptHash ?? receipt.receipt_hash) as string | undefined;
  if (!claimed) return { ok: false as const, error: "no receiptHash field" };
  const recomputed = await sha256Hex(canonicalJson(receiptBody(receipt)));
  return { ok: true as const, claimed, recomputed, match: recomputed === claimed };
}
