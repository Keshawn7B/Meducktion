# CASE//SIGNAL Development Roadmap

This roadmap is gated: each phase begins only after the prior phase's completion criteria are met. Medical review, accessibility, cost control, and the fictional-game disclaimer are cross-cutting requirements.

## Phase 0: Documentation and validation

**Goals:** Establish product boundaries, validate the core loop on paper, and remove high-cost uncertainty before code.

**Deliverables:** Stored PRD/MVP/architecture/roadmap; architecture inventory; reusable-system assessment; finalized action economy and resolution order; paper-tested first case; case schema; medical-review workflow; initial visual direction.

**Dependencies:** Access to any prior app/room source; product decisions; an identified medical review process; representative playtesters.

**Risks:** Designing against nonexistent legacy assumptions, unbalanced Focus/tests, misleading case content, scope expansion.

**Completion criteria:** Documents approved; repository baseline confirmed; first case passes internal consistency and paper playtests; content schema and review gates agreed; unresolved MVP decisions have owners.

## Phase 1: One-case vertical slice

**Goals:** Prove the solo deduction, safety, and Case Call loop with one polished Guided case.

**Deliverables:** App shell; solo case; patient panel; Evidence and Differential Boards; action selection/locking; test queue; stability/progression; Case Call; scoring/results; tutorial; responsive accessible layout; deterministic engine and automated tests.

**Dependencies:** Phase 0 schema, reviewed case, visual direction, resolution ordering, scaffolded React/Vite/TypeScript toolchain.

**Risks:** Quiz-like flow, confusing evidence relationships, mobile crowding, brittle rules in UI, overlong sessions.

**Completion criteria:** All MVP solo acceptance criteria pass; type check/build/tests pass; keyboard/mobile checks pass; playtests show players understand locking, stability, differential ranking, and final-call reasoning.

## Phase 2: Cooperative multiplayer MVP

**Goals:** Make the validated loop reliable and understandable in private cooperative rooms while remaining Spark-compatible.

**Deliverables:** Reused/adapted rooms or documented migration; anonymous auth; shared patient/phase state; per-player action locking/status; deterministic resolution; reconnection; host migration; Guided co-op UX; quota instrumentation and free-tier optimization.

**Dependencies:** Stable Phase 1 engine; verified Firebase baseline; Firestore model/rules; emulator tests; defined disconnect policy.

**Risks:** Concurrent resolution, excessive writes/listeners, stale presence, host loss, accidental exposure of hidden data, unclear team authority.

**Completion criteria:** Two or more clients complete the case; concurrent locks resolve once; refresh/reconnect and host migration tests pass; rules tests pass; measured operation counts fit the documented free-tier budget; no claim of cheat resistance.

## Phase 3: Content expansion

**Goals:** Demonstrate replayability and a sustainable reviewed-content pipeline.

**Deliverables:** Eight reviewed cases total; Standard difficulty; authored variants; improved tutorial and bundled art; accessible case library; schema/content validation reports.

**Dependencies:** Medical reviewers, source/review metadata process, stable schema/engine, reusable art direction, playtest capacity.

**Risks:** Authoring bottleneck, inconsistent difficulty, misinformation, repetitive strategy, art inconsistency, bundle growth.

**Completion criteria:** Eight cases pass medical/content review and automated validation; Standard difficulty meets clarity targets; variants produce meaningful decisions; case library works on mobile; content regression suite passes.

## Phase 4: Competitive systems

**Goals:** Explore fair competition without incentivizing unsafe choices or overstating client security.

**Deliverables:** Ward Race; safety-weighted competitive scoring; match history; ranked scoring and anti-cheat protections only with trusted server evaluation if funding becomes available.

**Dependencies:** Strong co-op retention; funding/operational plan for authoritative evaluation; privacy/moderation design; larger balanced case set.

**Risks:** Unsafe speed incentives, cheating, operational cost, toxic behavior, fragmented queues, ranking medical competence by implication.

**Completion criteria:** Safety dominates speed in simulations/playtests; authoritative trust boundary exists before ranked launch; threat model and privacy review complete; matchmaking has viable population; messaging explicitly rejects competence claims.

## Phase 5: Roles and progression

**Goals:** Add long-term variety and identity without pay-to-win mechanics or diagnosis-revealing powers.

**Deliverables:** Doctor roles; cosmetic progression; achievements; additional case categories; daily authored cases with review/version controls.

**Dependencies:** Stable balance, content pipeline capacity, account/progression design, moderation and retention evidence.

**Risks:** Role imbalance, grind, scope creep, inaccessible team composition, daily-review burden, role titles implying credentials.

**Completion criteria:** Every role improves information management without revealing truth; no required composition; progression is cosmetic/non-credentialing; achievements reward safe reasoning; daily cases meet the same review gate as library cases.

## Cross-phase controls

- Keep the disclaimer visible in onboarding, case introduction, and debrief.
- Require authored, sourced, versioned, reviewed content for public release.
- Recheck scope, Spark usage, accessibility, and mobile usability at every gate.
- Never introduce live unreviewed AI medical content.
- Reassess title availability before branding investment or public launch.

## Immediate unresolved decisions

- Confirm whether an existing application/Firebase room system will be supplied; none is present now.
- Paper-test Focus costs, Care Budget, delays, stability changes, and complication timing.
- Select team or per-player differential ownership for cooperative play.
- Define reviewer qualifications, sign-off records, and re-review triggers.
- Decide the client-only room expiry policy and acceptable data retention.
