# Meducktion Local Solo Vertical Slice

## Structure and responsibilities

The Vite/React app renders the existing case content, engine state, selectors, events, and structured errors. React owns only temporary view state such as the mobile tab, open Case Call, event-log disclosure, and unsaved form drafts. It never resolves rules or scores.

The framework-independent `game-session` layer wraps engine state with pinned case/schema/content versions, a session ID, monotonic command sequence, applied command IDs, and command envelopes. It validates revision and ordering, makes repeated command IDs idempotent, and delegates every gameplay transition to `transitionGame`.

## Persistence and snapshots

Successful commands autosave the complete session under `meducktion:solo-session`. Core session code depends on a replaceable storage adapter; only the React hook constructs the browser `localStorage` adapter. A valid save under the former prototype namespace is migrated once to the Meducktion namespace. Snapshot loading rejects malformed JSON, missing fields, unsupported session versions, unknown cases/variants, incompatible schema/content versions, malformed engine structure, and conflicting pins. Temporary UI state is never serialized. Invalid saves are reported and removed when resume is attempted.

## Screens and engine interaction

- Landing: disclaimer, one-case prototype message, new and conditional resume actions.
- Case introduction: Jordan Lee, starting findings/resources, Guided explanation, and engine `START_CASE` command.
- Game dashboard: persistent patient/stability status, evidence, phase-specific controls, actions, provisional resources, pending tests, shared differential editing, results reveal, Case Call form, and collapsible event history.
- Results: engine outcome, total/category scores, named penalties, final state, authored answer/debrief, and reset.

Selections remain provisional; Lock and Resolve are separate engine commands. Results use transition events. Differential changes use `UPDATE_DIFFERENTIAL`; Case Calls use authored options and `SUBMIT_CASE_CALL`. No correctness or progression logic exists in components.

## Styling, accessibility, and responsive behavior

The centralized CSS uses the documented dark clinical-mystery tokens, rounded signal panels, restrained gradients, CSS-built non-graphic patient art, and evidence accents. Desktop uses three columns. At tablet/mobile widths it becomes an accessible four-view tab layout with persistent status, full-width controls, wrapping cards, and a focused Case Call dialog.

Semantic landmarks/headings, a skip link, visible focus rings, labeled controls, keyboard buttons for ranking, non-drag evidence assignment, `aria-live` errors/results, 44px targets, textual stability labels, and reduced-motion behavior are included. Status never relies on color alone.

## Testing

Session tests cover version pins, command success/idempotency/order/revision, serialization, malformed and incompatible snapshots, storage, replay, and exclusion of temporary UI state. UI behavior tests cover all four screens, provisional action behavior, deliberate locking/resolution, test timing, errors, resume/reset, and engine-generated terminal scoring. Existing schema and engine suites remain authoritative.

## Current limitations and Firebase boundary

This is one local solo authored case. It has no Firebase, authentication, multiplayer, routing, analytics, professional medical approval, or server authority. The session ID is a local transport identifier and does not affect gameplay.

Future Firebase integration must reuse the session envelope, pinned versions, command idempotency, expected revision, engine snapshots, and engine events. Firebase may transport and persist commands/snapshots; it must not duplicate rules, recalculate scores, advance tests, infer hidden results, or introduce network/time state into deterministic gameplay.
