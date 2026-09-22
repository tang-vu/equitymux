"""Runtime configuration. All mainnet execution is OFF unless explicitly enabled.

Safety model: even a permissive user Constitution can never exceed the
system-level ceilings defined here. EXECUTION_ENABLED defaults to False and indeed
the default value of MAX_MAINNET_NOTIONAL_USD is small on purpose.
"""

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Layout-derived root; EQUITYMUX_REPO_ROOT overrides for non-standard deploys.
REPO_ROOT = Path(os.environ.get("EQUITYMUX_REPO_ROOT") or Path(__file__).resolve().parents[3])
DX_DIR = REPO_ROOT / "dx"
FIXTURES_DIR = REPO_ROOT / "fixtures"
DB_PATH = REPO_ROOT / "data" / "equitymux.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(REPO_ROOT / ".env"), env_prefix="", extra="ignore")

    # --- mode ---
    demo_mode: bool = False  # serve recorded fixtures instead of live APIs

    # --- Binance public endpoints (no key) ---
    binance_www_base: str = "https://www.binance.com"
    binance_web3_base: str = "https://web3.binance.com"
    http_timeout_s: float = 25.0
    http_max_retries: int = 3
    user_agent: str = "equitymux/0.1 (binance-web3-skill-compatible)"

    # --- Agentic Wallet ---
    baw_bin: str = "baw"
    baw_timeout_s: float = 60.0

    # --- BSC RPC (read-only verification + simulation fallback) ---
    bsc_rpc_urls: str = (
        "https://bsc-dataseed.binance.org,https://bsc-dataseed1.defibit.io,https://bsc-dataseed1.ninicoin.io"
    )

    # --- x402 payment surface (keeper tasks) ---
    # When set, POST /api/agent/tasks/paid answers 402 with an x402 `accepts`
    # challenge addressed to this wallet. Empty = surface defined but unpaid.
    x402_payto_address: str = ""

    # --- CORS (comma-separated browser origins allowed to call the API) ---
    cors_origins: str = "http://localhost:3000"

    # --- execution kill switches (system ceiling, never relaxed by user policy) ---
    execution_enabled: bool = False
    require_simulation: bool = True
    require_confirmation: bool = True
    max_mainnet_notional_usd: str = "25"  # Decimal-safe string
    allowed_chain_ids: str = "56"
    allowed_token_platforms: str = "ondo,xstocks,bstock"
    allowed_quote_assets: str = "USDC,USDT,USD1,U"
    max_slippage_bps_hard: int = 100
    max_premium_bps_hard: int = 100
    max_simulation_age_s: int = 60
    max_quote_age_s: int = 30
    max_reference_age_s: int = 900  # stale reference ceiling used when policy sets none

    @property
    def rpc_urls(self) -> list[str]:
        return [u.strip() for u in self.bsc_rpc_urls.split(",") if u.strip()]

    @property
    def chain_ids(self) -> set[int]:
        return {int(x) for x in self.allowed_chain_ids.split(",") if x.strip()}

    @property
    def platforms(self) -> set[str]:
        return {x.strip().lower() for x in self.allowed_token_platforms.split(",") if x.strip()}

    @property
    def quote_assets(self) -> set[str]:
        return {x.strip().upper() for x in self.allowed_quote_assets.split(",") if x.strip()}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
