# Meducktion Product Requirements Document

**Official working title:** Meducktion

**Tagline:** *Reveal the clues. Solve the case. Outsmart the room.*

**Status:** Current competitive-card direction

**Title clearance:** Before public launch, check trademark, domain, social-handle, app-store, and other platform availability.

> **Medical disclaimer:** Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.

## 1. Supersession notice

Meducktion is now a beginner-friendly competitive medical mystery card game. The former cooperative clinical-simulator design—Care Intervals, Focus, Care Budget, numerical stability, delayed test queues, treatments, urgency and next-step choices, ranked differentials, and long Case Calls—is superseded for active gameplay.

Useful decisions from that work remain: authored and versioned medical content, stable IDs, deterministic rules, structured commands/events/errors, local snapshot validation, accessibility, plain language, prominent disclaimers, and professional review before release. The complete change and legacy boundary are documented in [the competitive card-game refactor](MEDUCKTION_CARD_GAME_REFACTOR.md).

## 2. Product vision

Meducktion is a colorful 2–4 player medical deduction card game for people with little or no medical knowledge. Everyone investigates the same fictional patient, plays one investigation card per round, receives clues, and decides when to diagnose one of four possible conditions. Highest score wins.

The experience should feel like a polished deduction card game, light competitive party game, and cozy medical mystery. Learning is a welcome result of play, not an examination of prior medical knowledge.

## 3. Target audience

- Teen and adult casual players
- Friends playing together
- Players who enjoy deduction, card, and party games
- Players curious about medical mysteries
- Players with no medical background

The game does not assume knowledge of differentials, medical abbreviations, laboratory terminology, clinical urgency, treatment planning, or evidence grading. Main-interface language explains everything needed to play.

## 4. Product goals

- Explain the complete loop to a first-time player in under one minute.
- Deliver a satisfying 6–10 minute match with meaningful deduction and limited luck.
- Center competition while avoiding elimination or rewards for unsafe real-world behavior.
- Make clues, cards, and four condition choices readable on desktop and mobile.
- Preserve medically coherent authored content and explain the answer in beginner-friendly language.
- Reproduce a match from the same seed, content version, players, and commands.
- Keep active game rules independent of React and future networking.

## 5. Non-goals

- Medical advice, diagnosis, clinical training, certification, or proof of competence
- Realistic hospital, electronic-record, treatment-management, or patient-stability simulation
- Detailed medication dosing or procedural instruction
- Online rooms, Firebase networking, authentication, matchmaking, or ranked play in the local slice
- Complex AI, bluffing, player-authored clue text, or AI-generated live cases
- Graphic medical content, strict timers, voice/video chat, or paid services

## 6. Core competitive loop

```text
Meet the patient
→ receive three cards
→ choose and lock one card
→ reveal all players' cards
→ receive clues
→ review four possible conditions
→ diagnose or continue
→ draw back to three cards
→ repeat for up to ten rounds
→ compare scores
```

MVP defaults are ten rounds, a three-card starting hand, one card per player per round, one free redraw, diagnosis unlocked after Round 2, no more than two diagnosis attempts, and no strict timer. The local test setup is one human versus one deterministic Balanced bot; the state model supports 2–4 players.

## 7. Cards and information

Only four categories are active:

- **Ask:** patient history and symptoms.
- **Check:** simple physical findings or observations.
- **Test:** stronger objective clues that resolve in the reveal round.
- **Special:** no more than five simple draw, swap, repeat, opinion, or sharing effects.

Each card is a stable, case-compatible data definition with display copy, icon key, result/effect, visibility, and duplicate policy. Each opening hand guarantees an Ask, a Check, and a Test or Special. Test cards are less common than Ask and Check cards. After two rounds without a meaningful undiscovered clue, deterministic bad-luck protection favors a useful compatible draw.

The patient, starting information, conditions, round, shared event, public clues, played card categories, and diagnosis status are public. Hands, private clue text, diagnosis choices, and unused redraws remain private until the results recap. The interface never reveals an opponent's private clue during active play.

## 8. Controlled randomness

The three MVP randomness sources are independently shuffled player decks, one authored case variant, and one shared event in Round 2 or 3. A stored seed drives all three plus bot tie-breaks. The engine does not use uncontrolled `Math.random()`.

Randomness may change deck order, draws, event, and route to useful evidence. It never changes the hidden diagnosis, medical relationship of a clue, authored card result, correctness, or scoring. Fixed inputs and commands must reproduce identical state.

## 9. Round lifecycle

```text
match_intro
→ round_draw
→ card_selection
→ cards_locked
→ card_reveal
→ clue_review
→ diagnosis_window
→ next_round
→ match_complete
```

A player may change a selection before locking. Selection and locking do not reveal or resolve a card. Once all active players lock, the reveal applies card effects, routes clues by visibility, and resolves the shared event at its authored round. Active players draw back to three. Diagnosed players remain visible as spectators while the match finishes.

The match ends when every player has made a final diagnosis or after Round 10 and its final diagnosis window.

## 10. Diagnosing and scoring

A valid diagnosis chooses one of the four conditions and two distinct clues available to that player. A correct player cannot resubmit. A first wrong answer subtracts 150 points and blocks another attempt until the next round. A second wrong answer subtracts another 150 and exhausts attempts. No player is eliminated.

Maximum score is 1,000:

| Category | Points |
|---|---:|
| Correct diagnosis | 500 |
| Two legitimate supporting clues | 200 |
| Timing: Round 2 / 3 / 4 | 150 / 100 / 50 |
| Efficient investigation | 100 |
| One special achievement | 50 |

Wrong-attempt penalties apply after category scoring; the result is clamped to 0–1,000. Ties break by earlier correct round, fewer wrong attempts, then more valid supporting clues. An exact tie uses a deterministic mystery draw derived from the match seed, producing one winner without favoring submission or player order.

## 11. First case

`The Pain That Moved` retains fictional patient Jordan Lee, age 20, with stomach pain and nausea. The four beginner choices are Appendicitis, Stomach infection, Urinary infection, and Kidney stone. Stable case and clue IDs, content versions, source metadata, and review status remain intact.

Main clues use plain language, including pain beginning near the middle, moving to the lower-right, appetite change, no diarrhea, lower-right tenderness, mild fever, and carefully phrased blood, urine, and ultrasound findings. Detailed terminology belongs only in optional reviewed explanations. The case remains pending professional medical review before public release.

## 12. Main product surfaces

- **Home:** wordmark, tagline, Play, How to Play, secondary Practice, artwork, and disclaimer.
- **Match setup:** player name, local bot opponent, selected case, short rules, and Start Match.
- **Patient introduction:** prominent portrait/story, four condition cards, four-round indicator, and Deal Cards.
- **Match:** patient header, round/event status, conditions, public clues, reveal area, opponent status, hand, redraw, Lock, Reveal, and Diagnose.
- **Diagnosis:** four conditions, known clue choices, attempts remaining, consequence, accessible errors, and confirmation.
- **Results:** winner, rankings, score categories, penalties, investigation paths, simple medical explanation, and Play Again.
- **Tutorial:** at most six skippable/replayable panels covering the complete loop and scoring stakes.

Firebase room controls do not appear in the local slice.

## 13. Visual and accessibility requirements

The visual tone is approximately 40% playful, 30% cozy, 20% mysterious, and 10% medical. Use an illustrated patient, cozy clinic atmosphere, warm surfaces, soft gradients, large colorful cards, rounded condition tiles, friendly icons, expressive avatars, clear round progress, gentle animation, and restrained winner celebration. Avoid dense clinical dashboards, alarm styling, tiny labels, graphic anatomy, and persistent developer data.

Every category has a text label and icon in addition to color. Provide semantic headings/buttons, keyboard card selection, visible focus, live reveal/error announcements, reduced motion, touch targets, text zoom, selected/locked text states, accessible forms, and no required drag-and-drop.

## 14. Architecture and persistence requirements

Active gameplay uses a new framework-independent card engine with strict serializable state, immutable transitions, one public command function, deterministic bots, seeded random state, structured errors/events, and revisioned replay. React only renders state and dispatches commands through the session layer.

The previous Care Interval engine is isolated legacy code and is not an active UI dependency. Legacy tests may remain until deliberate removal. Current card snapshots use `meducktion:card-match`, pin seed and schema/content/variant versions, preserve hands/deck positions/clues/attempts/scores/revision/idempotency, and exclude temporary UI state. Former `meducktion:solo-session` snapshots are detected as incompatible rules and handled with a clear new-match path rather than reinterpreted.

## 15. Local bots and future multiplayer

The Balanced bot uses only its own hand/private clues and public information, prefers undiscovered meaningful clues, follows normal validation, and uses seeded tie-breaking. It is deliberately simple and deterministic.

The engine is transport-agnostic. Future Firebase code may synchronize validated commands and versioned snapshots, enforce revisions/idempotency, and manage rooms/presence. It may not duplicate rule resolution, bot reasoning, private-clue visibility, or scoring. Firebase, authentication, and online multiplayer are not implemented in this refactor.

## 16. Medical responsibility

Cases must be authored, source-supported, versioned, internally consistent, reviewed before public release, and explicit about simplifications. Avoid dosing, personalized advice, certainty from one clue, and claims that the game replaces professional care. Show the disclaimer on the home/onboarding experience, patient introduction, and debrief.

## 17. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Medical misinformation | Reviewed, sourced, versioned authored content and visible disclaimer |
| Beginner overload | Four card types, four conditions, three-card hands, plain language, short tutorial |
| Luck dominates | Seeded decks, opening guarantee, redraw, useful-draw protection, fixed truth |
| Private information leaks | Explicit visibility model and per-player selectors/session views |
| First correct player always wins | Multi-category scoring and deterministic tie-breaks |
| Legacy complexity returns | Separate active namespace and explicit legacy boundary |
| Client-side cheating | Accept for local play; define authoritative security before networking |
| Name conflicts | Complete trademark, domain, social, store, and platform review before release |

## 18. Historical decisions retained or superseded

| Prior decision | Current status |
|---|---|
| Authored, validated, versioned cases and stable IDs | Retained |
| Deterministic immutable rules and structured errors/events | Retained and adapted |
| Plain language, accessibility, disclaimer, medical review gate | Retained |
| Version-pinned local persistence | Retained with a new card-match snapshot/key |
| Cooperative play as the primary mode | Superseded by competitive 2–4 player play |
| Focus, Care Budget, stability, progression, delayed tests, treatments | Superseded; legacy engine only |
| Ranked differential and full Case Call with urgency/next step | Superseded by four choices plus two clues |
| Clinical safety-weighted 1,000-point score | Superseded by competitive five-category scoring |
| Dark clinical-dashboard visual identity | Superseded by warm, cozy card-game presentation |
| Firebase-first room implementation | Deferred behind a transport-agnostic local engine/session boundary |

The stable `CASE_SIGNAL_*` filenames remain to avoid breaking repository links. Where the historical decision log, paper playtest, legacy engine contract, architecture plan, or first UI slice conflicts with this PRD and [the refactor document](MEDUCKTION_CARD_GAME_REFACTOR.md), those older requirements are historical rather than active.
