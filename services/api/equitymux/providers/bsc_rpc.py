"""Minimal BSC JSON-RPC client: read-only verification + eth_call simulation.

No web3 dependency — plain JSON-RPC over httpx keeps the surface tiny and the
dependency tree auditable. Public endpoints only; every call is DX-recorded.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

import httpx

from equitymux.config import Settings, get_settings
from equitymux.dx.recorder import record_event
from equitymux.providers.errors import SimulationError, UpstreamHTTPError

ERC20_BALANCE_OF = "0x70a08231"  # balanceOf(address)
ERC20_ALLOWANCE = "0xdd62ed3"  # allowance(owner,spender)
ERC20_DECIMALS = "0x313ce567"


class BscRpc:
    def __init__(self, settings: Settings | None = None):
        self.s = settings or get_settings()

    def _call(self, method: str, params: list[Any]) -> Any:
        last_err: Exception | None = None
        for url in self.s.rpc_urls:
            t0 = time.perf_counter()
            try:
                r = httpx.post(
                    url,
                    json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
                    timeout=self.s.http_timeout_s,
                )
                latency = (time.perf_counter() - t0) * 1000
                payload = r.json()
                ok = r.status_code == 200 and "error" not in payload
                record_event(
                    module="bsc-rpc",
                    endpoint=url.split("//")[-1].split("/")[0],
                    operation=method,
                    method="POST",
                    http_status=r.status_code,
                    latency_ms=latency,
                    success=ok,
                    error_message=None if ok else json.dumps(payload.get("error"))[:300],
                )
                if ok:
                    return payload.get("result")
                last_err = UpstreamHTTPError(json.dumps(payload.get("error")), r.status_code, url)
            except Exception as e:
                record_event(
                    module="bsc-rpc",
                    endpoint=url,
                    operation=method,
                    method="POST",
                    success=False,
                    error_class=type(e).__name__,
                    error_message=str(e)[:200],
                )
                last_err = e
        raise last_err or UpstreamHTTPError("all BSC RPC endpoints failed")

    def chain_id(self) -> int:
        return int(self._call("eth_chainId", []), 16)

    def block_number(self) -> int:
        return int(self._call("eth_blockNumber", []), 16)

    def eth_call(self, to: str, data: str, block: str = "latest") -> str:
        return str(self._call("eth_call", [{"to": to, "data": data}, block]))

    def estimate_gas(self, tx: dict) -> int:
        return int(self._call("eth_estimateGas", [tx]), 16)

    def tx_receipt(self, tx_hash: str) -> dict | None:
        return self._call("eth_getTransactionReceipt", [tx_hash])

    def balance_of(self, token: str, owner: str) -> int:
        data = ERC20_BALANCE_OF + owner.lower().replace("0x", "").rjust(64, "0")
        res = self.eth_call(token, data)
        return int(res, 16) if res and res != "0x" else 0

    def decimals(self, token: str) -> int:
        res = self.eth_call(token, ERC20_DECIMALS)
        return int(res, 16) if res and res != "0x" else 18

    def simulate_call(self, to: str, data: str, value_wei: int = 0, from_addr: str | None = None) -> dict:
        """eth_call-based simulation. Returns success flag + return data + block."""
        tx: dict[str, Any] = {"to": to, "data": data}
        if value_wei:
            tx["value"] = hex(value_wei)
        if from_addr:
            tx["from"] = from_addr
        try:
            block = self.block_number()
            result = self._call("eth_call", [tx, hex(block)])
            return {
                "ok": True,
                "returnData": result,
                "block": block,
                "calldataHash": "0x" + hashlib.sha256(bytes.fromhex(data[2:])).hexdigest(),
            }
        except Exception as e:
            raise SimulationError(f"eth_call simulation failed: {e}") from e
