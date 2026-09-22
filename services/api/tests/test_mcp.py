"""Real MCP transport test, not just direct invocation of tool functions."""

import json
import sys

import pytest
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


@pytest.mark.asyncio
async def test_stdio_agent_round_trip():
    server = StdioServerParameters(command=sys.executable, args=["-m", "equitymux.mcp_server"])
    async with stdio_client(server) as (read, write):  # noqa: SIM117 — session uses transport streams
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            assert {t.name for t in tools.tools} == {"analyze_exposure", "compare_policy", "replay_decision"}
            result = await session.call_tool("analyze_exposure", {"text": "Buy $10 of NVDA"})
            assert not result.isError
            receipt = json.loads(result.content[0].text)
            assert receipt["dataLabel"] == "RECORDED"
            verified = await session.call_tool("replay_decision", {"receipt": receipt})
            assert json.loads(verified.content[0].text)["decisionMatch"]
            compared = await session.call_tool(
                "compare_policy", {"receipt": receipt, "policy": {"allowed_platforms": []}}
            )
            assert json.loads(compared.content[0].text)["receipt"]["decision"]["state"] == "NO_VALID_ROUTE"
            refused = await session.call_tool("execute_trade", {})
            assert refused.isError
