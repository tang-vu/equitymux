"""Typed exceptions for provider clients."""


class ProviderError(Exception):
    """Base for all provider failures. Carries endpoint + business code."""


class UpstreamHTTPError(ProviderError):
    def __init__(self, message: str, status: int | None = None, endpoint: str | None = None):
        super().__init__(message)
        self.status = status
        self.endpoint = endpoint


class BinanceBusinessError(ProviderError):
    """HTTP 200 but `code` in body != "000000"."""

    def __init__(self, message: str, code: str | None = None, endpoint: str | None = None):
        super().__init__(message)
        self.code = code
        self.endpoint = endpoint


class RateLimitError(UpstreamHTTPError):
    pass


class ValidationError(ProviderError):
    pass


class UnsupportedAssetError(ProviderError):
    pass


class UnsupportedPlatformError(ProviderError):
    pass


class QuoteExpiredError(ProviderError):
    pass


class SimulationError(ProviderError):
    pass


class BroadcastError(ProviderError):
    pass


class AuthenticationError(ProviderError):
    pass


class WalletNotConnectedError(AuthenticationError):
    pass


class FixtureMissingError(ProviderError):
    pass
