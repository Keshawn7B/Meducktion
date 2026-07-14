# Meducktion Game Engine

The engine is a pure TypeScript state-transition layer. It creates version-pinned case state, validates and locks actions, resolves deterministic Care Intervals, manages evidence/tests/treatments/progression, validates the shared differential and Case Calls, completes cases, and calculates the configured 1,000-point score.

## Command lifecycle and phases

`createInitialState` produces `case_intro`. `START_CASE` enters `planning`; selection commands only change provisional state. `LOCK_ACTIONS` freezes a stable action order and enters `actions_locked`. `RESOLVE_INTERVAL` produces `results_reveal`; `ACKNOWLEDGE_RESULTS` enters `decision`. From there the caller updates reasoning, submits a Case Call, completes safely after escalation, or continues to the next interval. Terminal commands produce `case_complete` and reject later gameplay commands.

Resolution interprets case data in this order: immediate stabilization/escalation; existing-test timer advancement; immediate action results and new test queueing; completed-test results; natural/conditional progression; warnings; complications; stability clamping; budget/action records; results reveal. A new delayed test keeps its full delay on its order interval and first decrements in the next resolution.

## State, events, and errors

Inputs and case content are never mutated. Every successful command returns a new serializable state, ordered events with monotonic sequence numbers, and no real timestamps. Stability changes are individual events with source, previous value, applied delta, and resulting value. Expected invalid commands return stable structured error codes and the unchanged input state.

## Case Calls and scoring

Case Calls require revealed, diagnosis-relevant support from two categories plus a different alternative and relevant weakening evidence. Incomplete calls do not consume attempts. A first complete incorrect call consumes the authored forced-delay interval; a second incorrect or authored unsafe call completes the case. Escalation stops authored deterioration and permits either a final call or safe unresolved completion.

Scoring is calculated once at completion from the terminal state and authored configuration. Recalculation is deterministic. Diagnosis, safety, reasoning, urgency/next step, efficiency, and speed remain independently bounded.

## Integration boundary

React should render selectors and dispatch commands without embedding rules. Firebase should synchronize commands/versioned snapshots outside the engine and never add timestamps or network state to engine decisions. Persistence, authentication, networking, host migration, UI animation, and medical content authoring/review remain outside this package.
