"""Execution state machine with validated transitions and persisted history."""

from __future__ import annotations

from datetime import UTC, datetime

from equitymux.domain.models import ExecState

_ALLOWED: dict[ExecState, set[ExecState]] = {
    ExecState.INTENT_RECEIVED: {ExecState.INTENT_COMPILED, ExecState.POLICY_REJECTED},
    ExecState.INTENT_COMPILED: {ExecState.AWAITING_POLICY_APPROVAL, ExecState.DISCOVERING},
    ExecState.AWAITING_POLICY_APPROVAL: {ExecState.DISCOVERING, ExecState.POLICY_REJECTED},
    ExecState.DISCOVERING: {ExecState.QUOTING, ExecState.NO_VALID_ROUTE},
    ExecState.QUOTING: {ExecState.POLICY_EVALUATION, ExecState.NO_VALID_ROUTE},
    ExecState.POLICY_EVALUATION: {
        ExecState.SIMULATING,
        ExecState.NO_VALID_ROUTE,
        ExecState.AWAITING_CONFIRMATION,
        ExecState.POLICY_REJECTED,
    },
    ExecState.NO_VALID_ROUTE: set(),
    ExecState.SIMULATING: {ExecState.AWAITING_CONFIRMATION, ExecState.READY, ExecState.SIMULATION_FAILED},
    ExecState.SIMULATION_FAILED: set(),
    ExecState.AWAITING_CONFIRMATION: {ExecState.READY, ExecState.POLICY_REJECTED},
    ExecState.READY: {ExecState.EXECUTING, ExecState.POLICY_REJECTED},
    ExecState.EXECUTING: {ExecState.PENDING_CONFIRMATION, ExecState.EXECUTION_FAILED},
    ExecState.PENDING_CONFIRMATION: {ExecState.CONFIRMED, ExecState.EXECUTION_FAILED},
    ExecState.CONFIRMED: set(),
    ExecState.EXECUTION_FAILED: set(),
    ExecState.POLICY_REJECTED: set(),
}

TERMINAL = {s for s, nxt in _ALLOWED.items() if not nxt}


class InvalidTransition(Exception):
    pass


class ExecutionStateMachine:
    def __init__(self):
        self.state = ExecState.INTENT_RECEIVED
        self.history: list[dict] = [
            {
                "state": self.state.value,
                "at": datetime.now(UTC).isoformat(),
                "note": "intent accepted",
            }
        ]

    def transition(self, to: ExecState, note: str = "") -> ExecState:
        if to not in _ALLOWED[self.state]:
            raise InvalidTransition(f"{self.state.value} -> {to.value} not allowed")
        self.state = to
        self.history.append({"state": to.value, "at": datetime.now(UTC).isoformat(), "note": note})
        return to

    @property
    def terminal(self) -> bool:
        return self.state in TERMINAL
