import pytest

from equitymux.domain.models import ExecState
from equitymux.services.state_machine import ExecutionStateMachine, InvalidTransition


def test_happy_path():
    sm = ExecutionStateMachine()
    for s in (
        ExecState.INTENT_COMPILED,
        ExecState.DISCOVERING,
        ExecState.QUOTING,
        ExecState.POLICY_EVALUATION,
        ExecState.SIMULATING,
        ExecState.AWAITING_CONFIRMATION,
        ExecState.READY,
        ExecState.EXECUTING,
        ExecState.PENDING_CONFIRMATION,
        ExecState.CONFIRMED,
    ):
        sm.transition(s)
    assert sm.terminal and len(sm.history) == 11


def test_invalid_transition_rejected():
    sm = ExecutionStateMachine()
    with pytest.raises(InvalidTransition):
        sm.transition(ExecState.CONFIRMED)


def test_terminal_states_have_no_exits():
    sm = ExecutionStateMachine()
    sm.transition(ExecState.INTENT_COMPILED)
    sm.transition(ExecState.DISCOVERING)
    sm.transition(ExecState.NO_VALID_ROUTE)
    with pytest.raises(InvalidTransition):
        sm.transition(ExecState.QUOTING)


def test_history_persisted_shape():
    sm = ExecutionStateMachine()
    sm.transition(ExecState.INTENT_COMPILED, note="x")
    assert sm.history[-1]["note"] == "x" and "at" in sm.history[-1]
