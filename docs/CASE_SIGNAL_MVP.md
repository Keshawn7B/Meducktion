# Meducktion Competitive Card Game MVP Specification

**Tagline:** *Reveal the clues. Solve the case. Outsmart the room.*

> **Medical disclaimer:** Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.

## Supersession notice

This specification replaces the former solo/cooperative clinical vertical slice as the active MVP. The earlier Focus, Care Budget, patient stability, delayed-test queue, treatment, ranked-differential, and complex Case Call requirements are historical. Validated content, stable IDs, deterministic transitions, strict TypeScript, local persistence patterns, accessibility foundations, and medical-review safeguards are retained.

See [the card-game refactor](MEDUCKTION_CARD_GAME_REFACTOR.md) for the complete rationale, architecture boundary, and historical references.

## Objective

Deliver one polished local competitive vertical slice that proves a beginner can play a four-round medical mystery card match against a deterministic bot, understand the clues without medical training, make a simple diagnosis, and compare transparent scores.

## Included scope

- React, TypeScript, and Vite web game with responsive desktop/mobile presentation
- One local human player versus one Balanced bot by default
- Core state architecture compatible with 2–4 players
- Four rounds, three-card hands, and one card played per active player per round
- Ask, Check, Test, and Special card categories only
- Separate card selection, locking, reveal, clue review, and diagnosis phases
- Public and private clues with player-safe visibility
- Seeded deck shuffle, authored case variant, and one shared event
- Opening-hand category guarantee, one full-hand redraw, and deterministic bad-luck protection
- Diagnosis after Round 2 using one of four conditions and two known clues
- Two diagnosis attempts, wrong-answer penalties, no elimination, and 1,000-point scoring
- One complete converted case, `The Pain That Moved`
- Beginner-friendly tutorial, educational recap, visible disclaimer, and local resume/reset
- Comprehensive engine, bot, session, content, and focused UI tests

## Explicit exclusions

Firebase, authentication, online rooms, real-time networking, matchmaking, ranked play, paid services, advanced AI, strict timers, user-authored or live AI-generated cases, clinical roles, detailed treatment, medication dosing, patient-stability management, complex profiles, and more than one medically reviewed launch case.

Solo practice may remain secondary, but it must not displace competition as the primary presentation.

## Match defaults

| Setting | MVP value |
|---|---|
| Players | 2–4 supported; 1 human + 1 bot locally |
| Rounds | 4 |
| Starting hand | 3 cards |
| Cards played | 1 per active player per round |
| Diagnosis unlock | After Round 2 |
| Diagnosis attempts | 2 |
| Redraw | One full-hand redraw per player |
| Shared events | One in Round 2 or 3 |
| Timer | None |
| Target match length | 6–10 minutes |
| Conditions | 4 |

## First case conversion: The Pain That Moved

- **Patient:** Jordan Lee, age 20
- **Public introduction:** Jordan has felt sick and has had stomach pain since earlier today.
- **Hidden answer:** Appendicitis
- **Condition choices:** Appendicitis, Stomach infection, Urinary infection, Kidney stone
- **Important clue pool:** central pain, movement to the lower-right, little appetite, no diarrhea, lower-right tenderness, mild fever, inflammation on a blood test, urine not strongly suggesting infection, and supportive ultrasound wording

Main card and clue copy uses plain language. Optional `Learn more` content may explain reviewed terminology. Stable case/clue IDs and version/review metadata remain unchanged unless a deliberate migration is documented. No unreviewed medical claims may be added solely to increase variant count.

## Required playable flow

1. Home presents Meducktion, the current tagline, Play, How to Play, secondary Practice, artwork, and the disclaimer.
2. Match setup collects a player name, shows one Balanced bot, selected case, and a short rules summary.
3. Patient introduction presents Jordan, four possible conditions, ten rounds, and `Deal Cards`.
4. The engine creates a seeded match and deals each player a guaranteed usable three-card hand.
5. The human may select, change, or deselect one card before pressing `Lock Card`; the bot chooses and locks deterministically.
6. Locking does not resolve cards. Once all players lock, `Reveal` enters the authored reveal sequence.
7. Public clues join the shared board; private clues appear only to their owner; the shared event resolves once at its authored round.
8. Players review clues and, from Round 2 onward, may submit one condition plus two known clues or continue.
9. Active players draw back to three and repeat through Round 10. Diagnosed players remain visible without playing new cards.
10. The final window closes the match, calculates deterministic scores/rankings, reveals investigation paths, and explains the answer simply.
11. `Play Again` creates a new local match. A compatible saved card match resumes exactly; invalid or legacy saves offer a safe restart.

## Card and fairness requirements

- Cards are typed data definitions with stable IDs, case compatibility, visibility, clue/effect, duplicate policy, icon, and beginner-facing copy.
- Ask and Check cards are more common than Test cards; no more than five Special effects exist.
- Every opening hand contains an Ask, a Check, and a Test or Special.
- Each player has one full-hand redraw; a second redraw is rejected.
- After two rounds without a meaningful undiscovered clue, the next draw favors a useful compatible card deterministically.
- Played cards leave the hand and active hands draw back to three.
- Selection never reveals a result; all active players must lock before reveal.
- Private clue text never enters another player's active view.

## Randomness and replay requirements

A serializable seeded random state controls independent player deck shuffles, initial hands, later draws, one authored case variant, one shared event, and bot tie-breaks. The same case, content/schema version, variant, seed, players, and commands reproduce the same state and ordered event log. No active rule uses uncontrolled `Math.random()`.

Randomness changes only the investigation path. Diagnosis truth, clue meaning, authored results, scoring, and correctness remain fixed.

## Diagnosis and score requirements

A diagnosis is valid only after Round 2, for a match condition, with two distinct public or player-owned clues, while attempts remain and before a correct submission. The first wrong answer applies −150 and blocks another attempt until the next round. The second applies an additional −150 and exhausts attempts. Neither removes the player from the match.

Score categories are correct diagnosis (500), legitimate supporting clues (up to 200), timing (150/100/50 after Round 2/3/4), efficient investigation (up to 100), and one achievement (50). Wrong penalties apply last; total score is clamped to 0–1,000. Ranking uses score, earlier correct round, fewer wrong attempts, then more valid supporting clues. An exact tie uses a deterministic seed-derived mystery draw, so first place is unique without rewarding submission or player order.

## Engine and session requirements

The active application imports a separate framework-independent card engine rather than adapting the old Care Interval state machine. It uses strict serializable types, immutable state, structured commands/events/errors, one public pure transition function, seeded utilities, deterministic bot orchestration, and selectors that respect clue visibility. React contains display/form state only and never duplicates rules.

The active snapshot key is `meducktion:card-match`. It pins seed, case/variant/content/schema versions, players, phase/round, per-player hands and deck positions, locked cards, public/private clues, event, diagnosis state, scores, applied command IDs, sequence, and revision. Temporary UI/animation state is excluded.

Former `meducktion:solo-session` data cannot resume as a card match. Detect it safely, explain that the rules changed, and offer a new match without crashing or silently mutating the old snapshot.

The previous `src/game-engine` Care Interval implementation is legacy and must not power the active application. Its tests may remain until explicit removal. Firebase may later transport commands/snapshots but may not implement game rules; no Firebase or networking is part of this MVP.

## Required screens

- Home
- How-to-play tutorial of no more than six panels
- Match setup
- Patient introduction
- Main match with patient, round/event, conditions, clue board, opponent, reveal area, hand, redraw, and actions
- Diagnosis panel with attempts, consequences, accessible validation, one condition, and two clue choices
- Results with winner/rankings, category scores, penalties, paths, explanation, and Play Again

The normal interface does not expose stability numbers, Focus, Care Budget, delayed-test queues, treatments, urgency, next steps, full differential ranking, evidence-strength/reliability terms, complication trees, long Case Calls, clinical roles, burden calculations, or developer event payloads.

## Accessibility and responsive acceptance

- Semantic headings and buttons, visible keyboard focus, and keyboard-selectable cards
- Category text/icons in addition to color, plus screen-reader card labels
- Live announcements for reveal and validation feedback
- Reduced-motion support, no flashing, no required drag/drop, and large touch targets
- Clear selected/locked states and accessible diagnosis controls
- Usable layouts around 360 × 800, 768 × 1024, and 1440 × 900 without critical horizontal scrolling
- Readable cards, conditions, hand, diagnosis panel, and results at text zoom

## Acceptance criteria

The local MVP is complete only when:

- [ ] Meducktion is presented as a competitive card deduction game using the current tagline and disclaimer.
- [ ] A human can complete a four-round match against at least one deterministic bot.
- [ ] The engine supports 2–4 player definitions and three-card hands.
- [ ] Selection, lock, and reveal are distinct validated actions.
- [ ] Public/private clues, redraw, opening guarantee, shared event, and bad-luck protection work.
- [ ] Four conditions are visible and diagnosis unlocks only after Round 2.
- [ ] Diagnosis requires one condition and two known clues; wrong calls cost points without elimination.
- [ ] Deterministic score, ranking, winner, paths, and educational explanation appear at completion.
- [ ] Fixed seeds and command replay reproduce decks, events, bots, and final state.
- [ ] Card-match persistence resumes exactly and legacy saves fail safely.
- [ ] No active UI depends on the legacy clinical engine or exposes superseded complexity.
- [ ] Desktop/mobile layouts and keyboard/screen-reader behavior satisfy the stated checks.
- [ ] Strict type checking, all automated tests, case validation, and production build pass.

## Verification and release gate

Run:

```powershell
npm run typecheck
npm test
npm run validate:cases
npm run build
```

Do not skip failures or weaken strict typing. Public release additionally requires professional medical review and source approval, manual responsive/accessibility verification, real-player comprehension and balance testing, privacy/security design for any telemetry or networking, and working-title availability review.

Manual checks must be reported only when actually performed. At minimum they should cover a full match, fixed/different seeds, early and invalid diagnosis, wrong and correct diagnosis paths, final scoring, replay, persistence, and mobile/tablet/desktop layouts.

## Historical decisions

The original paper playtest, decision log, architecture plan, legacy engine contract, and solo UI document preserve evidence for the superseded clinical/cooperative prototype. They remain useful for medical content, deterministic engineering, validation, safety, and accessibility decisions. Their Focus, Care Budget, stability, delayed tests, treatments, ranked differential, clinical Case Call, old score, cooperative-first mode, and Firebase-room requirements are not acceptance criteria for this MVP.
