# CASE//SIGNAL MVP Decision Log

**Scope:** Phase 0 rules for the first playable version. These decisions supersede ambiguous or illustrative wording elsewhere; the case playtest is the executable design reference for *The Pain That Moved*.

## D-001: Care Interval boundary and Focus

- **Decision:** An interval begins at `planning`. Each solo player or cooperative player receives 2 Focus at that point; unspent Focus expires at lock. A Care Interval is counted after its resolution reaches `decision`.
- **Reason:** Gives the engine one reset point and preserves the requested per-player economy.
- **Alternatives considered:** Team-wide Focus; carryover Focus.
- **MVP consequence:** Cooperative MVP is balanced for one or two players; larger rooms are not supported for this case because extra players add actions.
- **Possible later revision:** Scale team Focus or action availability for larger rooms.

## D-002: Deterministic resolution order

- **Decision:** Resolve: (1) validate/atomically lock, (2) apply immediate safety/stabilization, (3) decrement timers for tests pending before this interval, (4) resolve new instant interview/exam/monitor actions and enqueue new tests, (5) reveal tests whose timers reached zero, (6) apply natural progression, (7) reveal warnings, (8) evaluate/apply complications, (9) clamp stability and derive state, (10) open `decision`.
- **Reason:** Separates immediate protection, existing test returns, and disease progression without timing ambiguity.
- **Alternatives considered:** Progression before treatments; decrementing a new test on its order interval.
- **MVP consequence:** A new delayed test begins with its full delay and first decrements during the next interval's resolution.
- **Possible later revision:** Case-specific priority hooks, while preserving a declared ordering contract.

## D-003: Differential ownership

- **Decision:** Solo has one player-owned differential. Cooperative MVP has one shared team differential. During planning, edits are local drafts; committing uses the room version. A version conflict reloads the latest ranking and asks the player to reapply. Last-write-wins is prohibited for silent conflicts.
- **Reason:** Shared reasoning is the cooperative product, while explicit conflict handling prevents lost edits.
- **Alternatives considered:** Private individual differentials; unrestricted real-time card writes.
- **MVP consequence:** Only committed ranking changes synchronize; card movement does not.
- **Possible later revision:** Optional private notes or role-specific views.

## D-004: Care Budget

- **Decision:** *The Pain That Moved* starts with 8 shared Care Budget units in solo or cooperative play. Costs are deducted on a valid lock. The budget cannot go below zero; unaffordable actions are rejected. Zero budget still allows zero-cost actions and Case Calls. Each unused unit adds 5 efficiency points, subject to the category cap.
- **Reason:** Eight permits a focused workup and safety action but not all tests and treatments.
- **Alternatives considered:** Per-player budget; debt; budget replenishment.
- **MVP consequence:** Multiplayer gains Focus but not purchasing power.
- **Possible later revision:** Difficulty-specific budgets and role discounts.

## D-005: Test queue and duplicate rules

- **Decision:** Blood count and urinalysis are major delayed tests with delay 1; ultrasound is a major delayed test with delay 2. At most two major tests may be pending. A test cannot be reordered while pending or after completion. Duplicate selection is rejected before lock without spending Focus/budget. Tests never resolve after case completion; unresolved tests are marked cancelled and reveal nothing.
- **Reason:** Makes delay and prioritization real while avoiding punitive accidental duplicates.
- **Alternatives considered:** Instant basic tests; penalized duplicates; post-case results.
- **MVP consequence:** Two tests may return together; a late ultrasound may never return.
- **Possible later revision:** Repeatable monitoring labs with authored repeat rules.

## D-006: Stability, treatments, and escalation

- **Decision:** Start and maximum recoverable stability are 82. Natural losses for Intervals 1–5 are 2, 4, 6, 8, and 10. If not escalated, Interval 4 adds 4 delay loss and Interval 5 adds 6; Interval 5 also triggers a warned 12-point complication. First/second supportive fluids add 4/2, then 0. First/second symptom support add 2/1, then 0. Values apply before progression and never raise stability above 82. Urgent escalation adds no stability but prevents current and future natural/delay/complication loss.
- **Reason:** Fully deterministic deterioration makes safety choices legible and testable.
- **Alternatives considered:** Random changes; repeatable full-strength treatment; escalation immediately ending resolution.
- **MVP consequence:** Escalation opens one final decision window: submit a Case Call or end with Safe stabilization without final diagnosis.
- **Possible later revision:** Authored ranges only if randomness is seeded, visible, and justified.

## D-007: Warnings and terminal thresholds

- **Decision:** Stability states retain PRD thresholds. Guided warnings appear on entering Guarded (75 or below), before Interval 4 delay loss, and before the Interval 5 complication. Critical is 25 or below; 0 is immediate failure. Five resolved intervals is the time limit.
- **Reason:** Telegraphs authored danger and aligns UI with progression.
- **Alternatives considered:** Warning only by interval; hidden complication thresholds.
- **MVP consequence:** At the Interval 5 decision, a complete call must be made or the case completes unresolved; failure at 0 bypasses the decision.
- **Possible later revision:** Case-specific warning thresholds.

## D-008: Incorrect and unsafe Case Calls

- **Decision:** Maximum two accepted Case Call attempts. Structurally incomplete calls are rejected with no cost and do not count. First complete but incorrect call removes 100 from the diagnosis category and consumes the next interval as delay with no Focus/actions; that interval resolves progression normally. A second incorrect call ends the case. A critically unsafe call—an urgency/next step explicitly marked contraindicated for a revealed red flag—ends the case immediately. Case Calls cost no Focus.
- **Reason:** Distinguishes UI validation from a reasoned but wrong decision and keeps the first version simple.
- **Alternatives considered:** One attempt; unlimited escalating attempts; Focus cost.
- **MVP consequence:** A corrected diagnosis after one wrong call can earn at most 250 diagnosis points.
- **Possible later revision:** Difficulty-specific attempt counts.

## D-009: Case completion

- **Decision:** Completion occurs on an accepted correct Case Call, second incorrect call, unsafe call, stability 0, final Interval 5 decision without an accepted call, or choosing to finish safely after escalation without a diagnosis. Pending tests are cancelled.
- **Reason:** Enumerates every terminal path for engine tests.
- **Alternatives considered:** Letting tests finish after escalation; indefinite post-Interval-5 decisions.
- **MVP consequence:** Results are final and idempotent.
- **Possible later revision:** Observation/transfer epilogues that do not change score.

## D-010: Solo persistence

- **Decision:** Persist solo runs in versioned `localStorage` after each meaningful transition. No Firestore is used. Invalid, incompatible, or completed saves are ignored/cleared with a user-facing restart option.
- **Reason:** Lowest-complexity free resume mechanism.
- **Alternatives considered:** Memory only; Firestore saves.
- **MVP consequence:** Resume is browser/device-specific and is not an account feature.
- **Possible later revision:** Opt-in cloud sync.

## D-011: Room expiry without Cloud Functions

- **Decision:** Set `expiresAt` to 24 hours after creation and refresh it to 2 hours after each committed transition if that is later. The host deletes on explicit close. Clients refuse entry to expired rooms and attempt best-effort deletion when rules allow. Abandoned documents may remain until a joining client detects expiry, the host closes, or a future maintenance process runs.
- **Reason:** Honest, Spark-compatible cleanup behavior.
- **Alternatives considered:** Cloud Functions TTL/cleanup; permanent rooms; frequent heartbeats.
- **MVP consequence:** Expiry is access control plus best-effort cleanup, not guaranteed deletion.
- **Possible later revision:** Managed TTL or maintenance job if infrastructure changes.

## D-012: Medical content lifecycle

- **Decision:** Status order is Draft → Source checked → Medical review required → Medically approved → Gameplay tested → Release approved; Retired is terminal from any released state. Internal development requires Draft. Closed external playtesting requires Source checked plus Medical review required (with the disclaimer and explicit unapproved label). Public release requires Release approved, which requires recorded medical approval and gameplay testing.
- **Reason:** Separates source verification, professional review, balance testing, and release authority.
- **Alternatives considered:** One approved flag; gameplay testing before source checks.
- **MVP consequence:** The first case remains **Draft / medical review required**; no professional approval is claimed.
- **Possible later revision:** Add legal/localization approvals and scheduled re-review.

## D-013: Guided assistance and mobile editing

- **Decision:** Guided mode shows all five authored candidates but recommends three initial contenders; definitions, evidence-direction explanations, budget/queue previews, and safety warnings are available. It never identifies the answer. Mobile uses Patient/Evidence/Differential/Actions tabs, a persistent phase/stability strip, non-drag rank controls, and a sticky review-and-lock action.
- **Reason:** Hiding two candidates conflicts with the required five-item differential and can over-signal the answer.
- **Alternatives considered:** Only three visible diagnoses; drag-only board; automatic evidence classification.
- **MVP consequence:** Assistance explains mechanics and vocabulary while classifications remain player decisions.
- **Possible later revision:** Adaptive hints after observed confusion.

## D-014: Exact scoring contract

- **Decision:** Use the deterministic formulas in the first-case playtest. Category scores are integers; no intermediate fractional points exist. The total is the sum of six bounded categories and is clamped to 0–1,000. Incorrect-call loss is applied inside Diagnosis.
- **Reason:** Removes illustrative penalty overlap and double counting.
- **Alternatives considered:** Global penalty ledger; percentage scoring.
- **MVP consequence:** Identical terminal state and reasoning produce identical scores.
- **Possible later revision:** Case-specific category rubrics while retaining the 1,000-point envelope.

## D-015: Content validation approach

- **Decision:** Use strict TypeScript types plus a lightweight dependency-free runtime validator. Reconsider Zod after application scaffolding, when package size, error formatting, and content-loading boundaries can be measured.
- **Reason:** Compile-time checks do not protect parsed or stale content; adding a schema dependency before package setup violates current scope.
- **Alternatives considered:** TypeScript only; installing Zod now.
- **MVP consequence:** The handwritten validator owns cross-reference, reachability, version, and numeric invariant checks and returns all structured errors.
- **Possible later revision:** Generate or replace runtime parsing with Zod while keeping the stable serialized format.

## D-016: Cooperative capacity

- **Decision:** Architect private cooperative rooms for two to four players, optimize the first playtests for two, and do not encode a permanent two-player restriction in case content.
- **Reason:** Avoids an unnecessary content-format limitation while acknowledging that per-player Focus changes balance with room size.
- **Alternatives considered:** Two players only; unbounded rooms.
- **MVP consequence:** Case metadata recommends two and permits four; human balance tests must cover three/four players before claiming support quality.
- **Possible later revision:** Team Focus scaling or mode-level caps outside authored case identity.

## D-017: Review authority and release gates

- **Decision:** Record role-based approvals for Content author, Source checker, Qualified medical reviewer, Gameplay reviewer, and Release approver. Local development requires Draft; closed internal playtests require an internal consistency check; external closed tests require Source checked plus Medical review required and an unapproved label; public release requires Release approved after Medically approved and Gameplay tested.
- **Reason:** Roles remain stable when people change and prevent source checking from being mistaken for medical approval.
- **Alternatives considered:** Named individuals in schema; one approval flag.
- **MVP consequence:** The first case is `medicalReviewRequired`, with medical and release approvals pending.
- **Possible later revision:** Organizational credential policy and expiry/re-review dates.

## D-018: Focused abdominal examination cost

- **Decision:** Keep the focused abdominal examination at 1 Focus. It reveals two related authored findings.
- **Reason:** Paper simulation shows it is strong but does not independently satisfy the complete reasoning and safety loop.
- **Alternatives considered:** Cost 2; split tenderness and guarding into separate actions.
- **MVP consequence:** This is explicitly a gameplay abstraction, not a claim about real clinical time or complexity.
- **Possible later revision:** Raise cost or split results if human playtests show it dominates other choices.

## D-019: Warning lead time versus resolution order

- **Decision:** Evaluate warnings after progression as established in D-002, but trigger the Interval-4 delay warning at the end of Interval 3 and the Interval-5 complication warning at the end of Interval 4.
- **Reason:** The paper table required warnings before losses, which contradicted the approved ordering; same-interval post-progression warnings would not allow a response.
- **Alternatives considered:** Move warning evaluation before progression; show warnings immediately before unavoidable loss.
- **MVP consequence:** Numeric progression is unchanged and each major authored deterioration has a full decision/planning window of notice.
- **Possible later revision:** Add explicit pre/post-progression warning timing if future cases need both.
