import { describe, expect, it } from "vitest";
import { canonicalJson, receiptBody, sha256Hex, verifyReceiptHash } from "./canonical";

// Reference vector produced by the Python backend:
//   json.dumps(v, sort_keys=True, separators=(",",":"), ensure_ascii=True)
//   sha256 -> 0xcb72ae...
const VECTOR = { a: "héllo 😀", b: [1, 2.5, null], c: { x: true, y: "line\nbreak" } };

describe("canonicalJson (Python parity)", () => {
  it("serializes identically to json.dumps sorted/compact/ensure_ascii", () => {
    expect(canonicalJson(VECTOR)).toBe(
      '{"a":"h\\u00e9llo \\ud83d\\ude00","b":[1,2.5,null],"c":{"x":true,"y":"line\\nbreak"}}',
    );
  });

  it("sorts keys recursively", () => {
    expect(canonicalJson({ z: 1, a: { y: 1, b: 2 } })).toBe('{"a":{"b":2,"y":1},"z":1}');
  });

  it("sha256 matches the backend vector", async () => {
    expect(await sha256Hex(canonicalJson(VECTOR))).toBe(
      // gitleaks:allow — published sha256 test vector, not a key
      "0xcb72ae217359a9a8363a325f0803679b0a0d883c2847f99d5833cf07eb358b85",
    );
  });
});

describe("receipt verification", () => {
  it("strips hash fields before hashing", () => {
    const body = receiptBody({ a: 1, receiptHash: "0x1", receipt_hash: "0x2" });
    expect(body).toEqual({ a: 1 });
  });

  it("verifies a self-consistent receipt", async () => {
    const r: Record<string, unknown> = { a: 1, intent: { ticker: "NVDA" } };
    r.receiptHash = await sha256Hex(canonicalJson(r));
    const out = await verifyReceiptHash(r);
    expect(out.ok && out.match).toBe(true);
  });

  it("rejects a tampered receipt", async () => {
    const r: Record<string, unknown> = { a: 1 };
    r.receiptHash = await sha256Hex(canonicalJson(r));
    r.a = 2;
    const out = await verifyReceiptHash(r);
    expect(out.ok && out.match).toBe(false);
  });
});
