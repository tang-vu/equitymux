"""MCP stdio adapter. The tool surface has no wallet or signing operation."""

from typing import Any, Literal

from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

from equitymux.services.decisions import DecisionPolicy, DecisionRequest, compare, decide, replay

mcp = FastMCP(
    "EquityMux",
    instructions="Compare BSC tokenized equity exposure. "
    "All results are analysis only. RECORDED is historical fixture data. "
    "A shortlist is not an executable quote. No tool can trade or sign.",
)
READ_ONLY = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True)


@mcp.tool(annotations=READ_ONLY)
def analyze_exposure(
    text: str, mode: Literal["recorded", "live"] = "recorded", policy: DecisionPolicy | None = None
) -> dict[str, Any]:
    """Compare one BUY intent, return policy checks and a portable decision receipt."""
    return decide(DecisionRequest(text=text, mode=mode, policy=policy or DecisionPolicy()))


@mcp.tool(annotations=READ_ONLY)
def replay_decision(receipt: dict[str, Any]) -> dict[str, Any]:
    """Recompute hash and decision offline; this does not attest source authenticity."""
    return replay(receipt)


@mcp.tool(annotations=READ_ONLY)
def compare_policy(receipt: dict[str, Any], policy: DecisionPolicy) -> dict[str, Any]:
    """Change policy against the identical snapshot; return changed route outcomes."""
    return compare(receipt, policy)


if __name__ == "__main__":
    mcp.run(transport="stdio")
