"""Agentic Wallet boundary: drives the official `baw` CLI (@binance/agentic-wallet).

This is Layer 4 of the authorization boundary. The wallet enforces user-defined
daily limits, token allowlists and abnormal-transaction handling server-side;
EquityMux adds its own Constitution + deterministic policy on top.

`baw` is only invoked with `--json` output. Errors are relayed verbatim per the
skill's error-handling guidance. Every invocation is DX-recorded.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import time
from typing import Any

from equitymux.config import Settings, get_settings
from equitymux.dx.recorder import record_event
from equitymux.providers.errors import (
    ProviderError,
    WalletNotConnectedError,
)


class BawResult(dict):
    pass


class AgenticWallet:
    def __init__(self, settings: Settings | None = None):
        self.s = settings or get_settings()

    def available(self) -> bool:
        return shutil.which(self.s.baw_bin) is not None

    def _run(
        self, args: list[str], *, module: str = "agentic-wallet", timeout: float | None = None
    ) -> dict[str, Any]:
        if not self.available():
            raise ProviderError("baw CLI not installed: npm i -g @binance/agentic-wallet")
        cmd = [self.s.baw_bin, *args, "--json"]
        t0 = time.perf_counter()
        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout or self.s.baw_timeout_s
            )
        except subprocess.TimeoutExpired as e:
            record_event(
                module=module,
                endpoint="baw " + " ".join(args[:2]),
                operation="cli",
                method="CLI",
                success=False,
                error_class="TimeoutError",
                error_message=str(e)[:200],
            )
            raise ProviderError(f"baw timed out: {' '.join(args[:3])}") from e
        latency = (time.perf_counter() - t0) * 1000
        out = proc.stdout.strip()
        try:
            payload = json.loads(out) if out else {}
        except json.JSONDecodeError:
            payload = {"success": False, "error": {"message": out or proc.stderr[:300]}}
        ok = bool(payload.get("success"))
        err = payload.get("error") or {}
        record_event(
            module=module,
            endpoint=f"baw {' '.join(args[:2])}",
            operation="cli",
            method="CLI",
            business_code=err.get("code"),
            latency_ms=latency,
            success=ok,
            error_class=err.get("name"),
            error_message=err.get("message"),
        )
        if not ok:
            name = err.get("name") or "BAW_ERROR"
            if name in ("NOT_LOGGED_IN", "UNCONNECTED", "AUTH_REJECTED"):
                raise WalletNotConnectedError(err.get("message") or name)
            raise ProviderError(f"{name}: {err.get('message') or 'unknown baw error'}")
        return payload.get("data", payload)

    # ---------- wallet state ----------
    def status(self) -> str:
        return str(self._run(["wallet", "status"]).get("status", "UNCONNECTED"))

    def chains(self) -> list[dict]:
        v = self._run(["wallet", "chains"])
        return v if isinstance(v, list) else v.get("chains", [])

    def address(self, chain_id: str = "56") -> str | None:
        for a in self._run(["wallet", "address"]).get("addresses", []):
            if str(a.get("binanceChainId")) == chain_id:
                return a.get("address")
        return None

    def balances(self, chain_id: str = "56") -> list[dict]:
        v = self._run(["wallet", "balance", "--binanceChainId", chain_id])
        return v if isinstance(v, list) else v.get("balances", v.get("assets", []))

    def settings(self) -> dict:
        return dict(self._run(["wallet", "settings"]) or {})

    def tx_lock(self, chain_id: str = "56") -> str:
        return str(self._run(["wallet", "tx-lock", "--binanceChainId", chain_id]).get("status", ""))

    def gas_price(self, chain_id: str = "56") -> dict:
        return dict(self._run(["wallet", "gas-price", "--binanceChainId", chain_id]) or {})

    def tx(self, tx_hash: str) -> dict:
        return dict(self._run(["wallet", "tx-history", "--tx", tx_hash]) or {})

    # ---------- market orders (quote / execute) ----------
    def quote(
        self, from_token: str, to_token: str, from_qty: str, chain_id: str = "56", slippage: str = "auto"
    ) -> dict:
        return dict(
            self._run(
                [
                    "market-order",
                    "quote",
                    "--fromTokenQty",
                    from_qty,
                    "--fromToken",
                    from_token,
                    "--toToken",
                    to_token,
                    "--binanceChainId",
                    chain_id,
                    "--slippage",
                    slippage,
                ]
            )
        )

    def swap(
        self,
        from_token: str,
        to_token: str,
        from_qty: str,
        chain_id: str = "56",
        slippage: str = "auto",
        mev: bool = True,
        gas_level: str = "MEDIUM",
    ) -> dict:
        return dict(
            self._run(
                [
                    "market-order",
                    "swap",
                    "--fromTokenQty",
                    from_qty,
                    "--fromToken",
                    from_token,
                    "--toToken",
                    to_token,
                    "--binanceChainId",
                    chain_id,
                    "--slippage",
                    slippage,
                    "--mev",
                    "true" if mev else "false",
                    "--gasLevel",
                    gas_level,
                ]
            )
        )

    def order(self, order_id: str) -> dict | None:
        data = self._run(["market-order", "list", "--orderId", order_id])
        for item in (data or {}).get("list", []):
            return item
        return None

    def x402_preview(self, payment_requirements: str) -> dict:
        return dict(self._run(["x402-payment", "preview", "--paymentRequirements", payment_requirements]))

    def x402_sign(self, payment_id: str, selected_index: int) -> dict:
        return dict(
            self._run(
                ["x402-payment", "sign", "--paymentId", payment_id, "--selectedIndex", str(selected_index)]
            )
        )
