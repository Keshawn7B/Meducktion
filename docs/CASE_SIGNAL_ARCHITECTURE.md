# Meducktion Architecture Plan

## Current-state assessment

At documentation time the repository has no source files, package manifest, Firebase configuration, existing room system, or established source convention. This is a planned greenfield architecture, not a description of implemented behavior. No dependencies or configuration are added by this task.

## Technology and cost constraints

Use React, TypeScript, Vite, Firebase Spark, Firestore, Firebase Anonymous Authentication, Firebase Hosting, bundled local assets, GitHub, Vitest, and Playwright where end-to-end coverage is valuable.

The MVP must not require paid APIs, Cloud Functions, App Hosting, paid databases, Cloud Storage, a custom server, paid image services, or paid AI inference. Spark quotas are a design boundary, not a guarantee of unlimited free operation.

## Proposed source organization

Because no current convention exists, use a feature-oriented UI plus framework-independent engine/content layers:

```text
src/
├── app/                     # routing, providers, app shell
├── features/
│   ├── patient/
│   ├── evidence/
│   ├── differential/
│   ├── actions/
│   ├── tests/
│   ├── case-call/
│   ├── results/
│   ├── tutorial/
│   └── rooms/
├── game-engine/
│   ├── resolveActions.ts
│   ├── resolveProgression.ts
│   ├── evaluateCaseCall.ts
│   ├── calculateScore.ts
│   └── engine.test.ts
├── case-content/
│   ├── schemas/
│   ├── cases/
│   ├── diagnoses/
│   └── validators/
├── firebase/                # auth, room repository, converters
├── types/
└── assets/                  # bundled, reviewed local assets
```

Tests should sit near units or in clearly named test directories; choose one convention during scaffolding. Case content stays version-controlled and separate from runtime room state.

## Architecture principles

- Keep UI and game rules separate; the engine is deterministic and testable without React or Firebase.
- Drive case logic from versioned data and stable IDs. Never hard-code diagnosis rules in components.
- Keep temporary selection, card expansion, drag state, and unsaved differential edits local.
- Write to Firestore only at meaningful transitions such as join, lock, resolve, Case Call, and completion.
- Reuse working room infrastructure if later supplied and compatible; avoid speculative adapters now.
- Pin multiplayer rooms to an immutable case ID and content version.
- Treat content validation and medical review state as release gates.
- Ranked cheat resistance is not an MVP requirement. A client-only Spark architecture cannot honestly protect hidden answers from a determined user.

## State boundaries

| State | Owner | Persistence |
|---|---|---|
| Case definitions and diagnosis content | Repository | Version-controlled files/bundle |
| Shared phase, interval, stability, revealed evidence, pending tests | Room state | Firestore at transitions |
| Locked player actions/status | Player subdocument or compact room partition | Firestore on lock/change of readiness |
| Hover, expanded cards, uncommitted selections | React client | Local only |
| Solo run | Engine/client | Versioned `localStorage` after meaningful transitions |
| Final outcome and score | Deterministic engine result | Shared completion snapshot |

Multiplayer resolution should be deterministic from the pinned content version, prior state, and locked actions. One designated resolver/host proposes the transition with an expected version; Firestore transaction checks prevent duplicate progression. This improves consistency but is not server-authoritative security.

## Planned core types

These are conceptual interfaces, not implementation commitments:

| Type | Required responsibility |
|---|---|
| `CaseDefinition` | Stable ID/version, patient, diagnosis truth, differential, starting clues, actions/tests/treatments, progression, complications, outcomes, debrief, review metadata |
| `PatientProfile` | Fictional identity, age, chief complaint, presentation, starting/max stability |
| `DiagnosisOption` | Stable ID, display term/definition, danger flags, valid evidence relationships |
| `ClueDefinition` | ID, category, text, strength, reliability, timing, source, visibility, red-flag flag, diagnosis-relative direction |
| `TestDefinition` | ID, costs, delay, burden, duplicate rule, result mapping/evidence yield |
| `TestResult` | Test ID, ordered/due interval, result ID/text, revealed evidence IDs, status |
| `TreatmentDefinition` | ID, costs, category, availability, stability/progression effects, contraindication rules |
| `ComplicationDefinition` | ID, triggers, warnings, stability/evidence effects, resolution behavior |
| `ProgressionRule` | Trigger conditions, interval/phase, priority, deterministic effects, explanation |
| `PlayerState` | Player ID/display name, connection/readiness, Focus, locked actions, optional differential |
| `DifferentialEntry` | Diagnosis ID, rank, confidence, evidence links/classifications |
| `PlannedAction` | Action ID, actor, targets, cost, selected interval, lock status |
| `CaseCall` | Diagnosis, urgency, next step, supporting clue IDs, alternative diagnosis and rationale |
| `ScoreBreakdown` | Six category subtotals, named penalties, total, outcome band, explanation IDs |

Types should favor tagged unions for phase/action/effect variants, branded or constrained IDs where useful, readonly case definitions, and explicit schema validation at the content boundary.

## Game engine responsibilities

- Validate phase transitions, Focus, budget, pending-test, duplicate, and action-lock rules.
- Resolve locked actions in documented deterministic order.
- Advance pending tests and reveal due results.
- Apply treatment effects, authored progression, warnings, complications, and bounded stability.
- Validate Case Calls, including evidence-category and serious-alternative requirements.
- Calculate the fixed 1,000-point score and explanatory outcome.

Resolution ordering must be specified before implementation so treatment, tests, natural progression, and complications cannot produce ambiguous results. Engine tests should cover every phase transition, boundary stability, duplicate resolution, reconnection replay, and the complete first-case happy/safety/failure paths.

## Firebase design principles

- Store compact public room state; never copy the full case definition into each write.
- Separate player action/readiness state to reduce contention and avoid exposing uncommitted choices when appropriate.
- Do not write for every card movement or differential reorder; submit only locked actions or committed changes.
- Add monotonically increasing room/state versions and transactional expected-version checks.
- Reconstruct a reconnecting client from pinned content plus shared phase/state.
- Support host migration through a deterministic eligible-host rule and lease/heartbeat timestamps compatible with client-only constraints.
- Expire abandoned rooms using an `expiresAt` field and client/admin cleanup strategy; without Cloud Functions, automatic deletion is not guaranteed, so retention and manual cleanup must be documented.
- Use least-privilege Firestore rules and validate allowed shapes/transitions as far as rules permit.
- Never claim client-side hidden answers or host-authored transitions are cheat-resistant.

### Conceptual room partition

```text
rooms/{roomId}                  compact shared snapshot and version
rooms/{roomId}/players/{uid}    presence, readiness, locked action payload
```

Exact collections and security rules require implementation review against Spark limits and the Firebase SDK selected later. Hidden case truth bundled in a web client is inspectable; private cooperative play accepts that limitation.

## Reconnection and host migration

A reconnecting player authenticates anonymously, loads the pinned case version and latest room snapshot, then derives the view from current phase and revealed IDs. Locked actions are idempotent by player/interval. If the host disappears, an eligible connected player takes the resolver lease using a transaction and expected room version. Conflicting or late resolutions are rejected and clients reload.

Presence based only on client timestamps is approximate. UX should tolerate brief disconnections, provide retry/rejoin paths, and avoid advancing while resolution ownership is uncertain.

## Shared differential and room expiry

Cooperative MVP synchronizes one committed team differential. Edits remain local drafts until a version-checked commit; conflicts reload and require an explicit reapply rather than silent last-write-wins. Rooms expire 24 hours after creation, extended to at least 2 hours after a committed transition. Hosts delete on explicit close; expired joins are refused and clients attempt deletion when permitted. Abandoned documents may remain until a client detects expiry or future maintenance exists.

## Testing strategy

- **Vitest:** pure engine rules, content validators, scoring, progression, serialization, and first-case fixtures.
- **Firebase Emulator Suite (development):** rules, concurrent locking, version conflicts, reconnect, and host migration without production quota usage.
- **React tests where valuable:** validation and accessible interactions, not duplicated engine logic.
- **Playwright:** solo critical path, private-room two-client path, mobile viewport, keyboard-only path, and recovery from refresh.
- **Build/type checks:** required release gates.

## Free-tier safeguards

Set explicit budgets for reads/writes per interval, listen only to necessary documents, unsubscribe inactive views, avoid high-frequency presence writes, compact snapshots, expire room access in product logic, and measure emulator/prototype operation counts before launch. Document expected concurrency and stop accepting new rooms before quota exhaustion creates a degraded clinical-safety metaphor.

## Architecture conflicts and decisions pending

There is no existing architecture to conflict with or reuse. The request's reference to an existing Firebase room system cannot be verified in the current repository. Before implementation, decide:

1. Whether prior application/room code will be imported or a greenfield app is intended.
2. Content schema format and validation library.
3. Whether cooperative rooms should remain capped at two players for this case.
4. Whether an emulator-tested client cleanup operation is permitted by final security rules.
