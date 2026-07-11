# CASE//SIGNAL Product Requirements Document

**Working title:** CASE//SIGNAL  
**Tagline:** *Read the evidence. Protect the patient. Call the case.*  
**Status:** Planning draft  
**Title clearance:** Before public launch, check trademark, domain, social-handle, app-store, and other platform availability.

> **Medical disclaimer:** CASE//SIGNAL is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. It must not be used to make decisions about real patients.

## 1. Product overview

CASE//SIGNAL is a cooperative-first, web-based medical deduction and strategy game. Players investigate authored fictional patient cases, spend limited actions to gather evidence, maintain a ranked differential diagnosis, protect patient stability, and submit a structured final Case Call.

The intended audience includes curious general players as well as early health-science learners. The appeal comes from choosing what information matters under resource and time pressure, discussing uncertain evidence, and balancing diagnostic confidence with safety. Success depends on a chain of decisions rather than recall of isolated facts.

It is not a quiz: evidence arrives through player choices, clues may support, conflict with, or leave diagnoses unresolved, and several safe outcomes may exist. It is not a deduction-game reskin: its identity is built around weighted evidence, limited Focus, delayed tests, a Care Budget, patient progression, treatment effects, differential ranking, and safety-aware scoring. It must not copy Deduckto's rules, terminology, branding, identity structure, hidden attribute combinations, YES/NO piles, guess penalties, or visual identity.

## 2. Target audience

- General players interested in medical mysteries
- Students considering medicine or health sciences
- Early health-science learners
- Players who enjoy cooperative deduction and strategy

The game should welcome players without medical knowledge through plain language and optional definitions. Performance, scores, and progression must never imply that a player is medically competent or qualified to diagnose or treat real people.

## 3. Product goals

- Be easy to understand in the first session and strategically rich at higher difficulties.
- Be replayable through authored cases, variants, meaningful tradeoffs, and multiplayer discussion.
- Present a polished, distinctive visual identity on desktop and mobile browsers.
- Make cooperative play the primary social experience while supporting solo and practice play.
- Be educational and medically responsible without sacrificing entertainment.
- Remain free to host and operate at MVP scale using Firebase Spark-compatible services and bundled assets.

## 4. Non-goals

- Real-world diagnosis, medical advice, certification, or proof of clinical competence
- Detailed medication dosing or procedural medical instruction
- A realistic hospital or electronic-medical-record simulation
- Public ranked matchmaking in the MVP
- Live AI-generated or user-created medical cases in the MVP
- Voice or video chat
- Graphic medical content

## 5. Core gameplay loop

Each Care Interval follows:

```text
Patient update
→ Differential review
→ Action planning
→ Lock actions
→ Resolve actions
→ Reveal evidence and results
→ Update patient stability
→ Decision window
→ Continue or submit Case Call
```

Canonical phase state machine:

```text
lobby
→ case_intro
→ planning
→ actions_locked
→ resolving
→ results_reveal
→ decision
→ planning
→ case_complete
```

Only valid transitions are permitted. The `decision → planning` transition starts another interval; `decision → case_complete` follows a final Case Call or terminal outcome.

## 6. Main objective

Players identify the most likely diagnosis, correct urgency, and safest next step while keeping the fictional patient above the failure threshold. Good play uses relevant evidence, considers a dangerous alternative, limits unnecessary testing, and avoids harmful actions or preventable delay.

## 7. Hidden case structure

Every versioned case contains a true diagnosis, presentation variant, severity stage, patient profile, chief complaint, starting evidence, differential pool, discoverable clues, available tests, treatment effects, progression track, complication triggers, valid final outcomes, educational debrief, and source/review metadata. Stable IDs connect authored content to engine rules. Player-facing state never exposes hidden answers before completion.

## 8. Player actions

Action categories are Interview, Examine, Monitor, Test, Treat or Stabilize, Consult, and Call the Case. Most actions cost Focus; players normally receive **2 Focus per Care Interval**. Actions are planned locally and have no game effect until deliberately locked. The action economy should force prioritization without making one early choice irrecoverable in Guided difficulty.

## 9. Evidence system

Each clue may define category, strength, reliability, direction, timing, source, visibility, and red-flag status.

- **Categories:** History, Symptom, Vital sign, Examination, Laboratory, Imaging, Treatment response, Complication
- **Strength:** Weak, Moderate, Strong, Defining
- **Relationship:** Supports, Conflicts, Unresolved

Direction is diagnosis-relative: the same clue can support one diagnosis, conflict with another, and leave a third unresolved. Reliability and timing communicate limitations. The game must not present fake numerical diagnostic probabilities, and it must not reduce evidence to binary YES/NO piles.

## 10. Differential diagnosis

Solo maintains one player-owned ranked differential; cooperative MVP maintains one shared team differential. Confidence levels are Unlikely, Possible, Plausible, Leading, and Highly supported. A complete Case Call requires at least two supporting clues from at least two evidence categories, one major alternative, and a reason that alternative is less likely.

Diagnoses may carry **Must Exclude**, **High danger**, or **Time sensitive** markers. These labels affect safety feedback and serious-alternative checks; they do not reveal the true diagnosis.

## 11. Tests

Every test defines Focus cost, Care Budget cost, result delay, patient burden, result content, duplicate-test rule, and evidence yield. No more than two major tests should be pending initially. Delays consume meaningful game time, duplicate orders are prevented or penalized, and low-value testing consumes resources so that ordering everything is never optimal.

## 12. Treatments

Treatments may be stabilizing, condition-specific, neutral, or harmful/contraindicated. MVP content uses broad treatment categories such as supportive fluids or urgent escalation, not medication doses or procedural instructions. Treatment response can become evidence but should not be portrayed as definitive in isolation.

## 13. Patient stability

Stability ranges from 0 to 100:

| Score | State |
|---:|---|
| 76–100 | Stable |
| 51–75 | Guarded |
| 26–50 | Unstable |
| 1–25 | Critical |
| 0 | Case failure |

Deterioration primarily results from authored disease progression, delay, ignored warnings, harmful actions, or triggered complications. Major changes must be explainable from the case state; unexplained severe random deterioration is prohibited.

## 14. Complications

Complications are authored, non-graphic, connected to delay or decisions, relevant to the case, and usually telegraphed before major deterioration. A warning may be a red-flag clue, trend, patient update, or explicit Guided-mode safety prompt. Complications should create decisions, not surprise punishment.

## 15. Winning and losing

Cooperative victory requires a correct diagnosis, correct urgency, acceptable next step, and patient stability above the failure threshold. Outcome bands are Excellent resolution, Safe resolution, Correct but inefficient, Correct diagnosis with poor patient outcome, Safe stabilization without final diagnosis, Incorrect diagnosis, and Critical failure. The results screen explains both the clinical-fiction outcome and the decisions that produced it.

## 16. Scoring

Maximum score is **1,000 points**:

| Category | Points |
|---|---:|
| Correct diagnosis | 350 |
| Patient safety and final stability | 200 |
| Evidence-based reasoning | 150 |
| Correct urgency and next step | 150 |
| Testing and resource efficiency | 100 |
| Speed or coordination | 50 |

Later cases may tune penalties for incorrect calls, unnecessary/duplicate tests, harmful treatment, ignored danger signs, delay-caused complications, and critical deterioration. For the MVP first case, the exact category-bounded formulas in [the paper-playtest specification](cases/THE_PAIN_THAT_MOVED_PLAYTEST.md) are authoritative. Penalties must be disclosed, deterministic from authored rules, bounded within category totals, and never reduce the overall score below zero.

## 17. Game modes

**MVP:** Solo, cooperative private rooms, and Practice mode.  
**Later:** Competitive Ward Race, Grand Rounds social mode, public matchmaking, and ranked play.

Cooperative play is the primary multiplayer mode. Competitive modes must not reward unsafe haste.

## 18. Difficulty levels

- **Guided:** plain-language terms, three differential choices where the case allows, evidence hints, generous resources, strong warnings, no forced timer.
- **Standard:** four or five choices, less explicit guidance, constrained resources, some equivocal findings, optional timer.
- **Expert (later):** atypical presentations, comorbidities, more alternatives, greater uncertainty, faster progression, fewer warnings.

Difficulty changes guidance and complexity, not the medical truth or disclaimer.

## 19. Doctor roles

Post-MVP possibilities include Acute Care, Diagnostic Specialist, Laboratory Specialist, Imaging Specialist, Medication Specialist, and Population Health Specialist. Roles may organize information, reduce particular costs, or improve coordination; they must not directly reveal the diagnosis or make one role essential.

## 20. Anti-random-guessing rules

- Enforce Case Call evidence requirements and serious-alternative reasoning.
- Escalate penalties for incorrect repeated calls.
- Limit Focus and Care Budget.
- Limit pending tests and apply authored result delays.
- Prevent or penalize duplicate tests and score inefficient testing.
- Require deliberate action locking and validate complete final submissions.

## 21. Visual identity

Tone is approximately **60% sleek, 25% playful, 15% mysterious**. Use a dark clinical-mystery dashboard, stylized patient illustrations, color-coded evidence cards, animated pulse/signal motifs, rounded panels, and strong hierarchy. Avoid realistic hospital-record styling and graphic imagery.

| Token | Color |
|---|---|
| Background | `#0B1220` |
| Elevated panel | `#111C2E` |
| Primary cyan | `#36D6E7` |
| Stable teal | `#22C7A9` |
| Uncertain amber | `#F4B942` |
| Danger coral | `#FF6B6B` |
| Laboratory violet | `#9B87FF` |
| Imaging blue | `#5BA7FF` |
| Primary text | `#F5F7FA` |
| Secondary text | `#A7B2C3` |

## 22. Web UI structure

Desktop uses patient status on the left, evidence workspace in the center, differential/actions on the right, and player status along the bottom. Mobile uses four primary destinations: Patient, Evidence, Differential, and Actions, with persistent safety and phase status.

Important screens are Home, Mode selection, Lobby, Case introduction, Main game, Patient view, Evidence panel, Test panel, Treatment panel, Diagnosis panel, Results, Tutorial, and—later—Profile/progression and Case library.

## 23. Accessibility

Provide keyboard navigation, visible focus states, screen-reader labels, reduced motion, non-color status indicators, large touch targets, text scaling, no hover-only actions, sound-independent feedback, optional timers, plain-language terms, expandable definitions, non-drag alternatives, and responsive mobile layouts. Accessibility acceptance checks belong in each feature, not only a final audit.

## 24. Medical responsibility

Cases must be authored, source-supported, versioned, internally consistent, reviewed before public release, and explicit about simplifications. Source/reviewer metadata should include review status and dates. AI may assist drafting, but unreviewed AI-generated cases cannot appear in public or ranked play.

Avoid detailed dosing, personalized advice, certainty based on one clue, claims that a clue always proves/excludes a condition, and any suggestion that the game replaces professional care. The fictional-game disclaimer must be prominent in the PRD, onboarding, case introduction, and debrief.

## 25. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Medical misinformation | Reviewed, sourced, versioned authored cases; visible simplifications and disclaimer |
| Excessive complexity | Guided onboarding, progressive disclosure, limited first differential |
| Quiz-like experience | Choice-driven discovery, uncertain evidence, resource and safety tradeoffs |
| Test-spamming | Focus/Budget costs, delays, queue limit, duplicate prevention, efficiency scoring |
| Competitive speed rewards unsafe decisions | Safety-weighted scoring and no ranked competitive MVP |
| Firebase free-tier overuse | Compact snapshots, transition-only writes, expiry, budgets and monitoring |
| Client-side cheating | Honest limitation; private/co-op MVP; server-authoritative ranked play later |
| Large case-authoring workload | Schema, templates, validation, staged review, limited initial content |
| Mobile UI overcrowding | Four-tab structure, progressive disclosure, device testing |
| Inconsistent AI-generated art | Art direction, curated bundled assets, human review, consistent asset pipeline |
| Scope creep | One-case vertical slice, explicit exclusions, phase gates and acceptance criteria |

## Phase 0 rule references

- [MVP decision log](CASE_SIGNAL_DECISIONS.md)
- [The Pain That Moved paper playtest](cases/THE_PAIN_THAT_MOVED_PLAYTEST.md)

Practice mode uses the same deterministic rules and displays a score, but does not contribute to later progression or competitive records. Medical reviewer qualifications and named release authority still require organizational approval before public release.
