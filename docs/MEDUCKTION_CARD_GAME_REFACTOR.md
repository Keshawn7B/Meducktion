# Meducktion Hidden-Identity Casual Game Refactor

**Status:** Current product and architecture direction

**Tagline:** *Reveal. Deduce. Diagnose.*

> **Medical disclaimer:** Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.

## Current default mode

The default mode is now `identity-casual`. The previous 1,000-point investigation game remains isolated in the repository for possible future Advanced or Ranked work, but it is inactive and absent from the default interface.

Each player receives a seeded, private Patient Identity and a separate seeded reveal deck. A central reveal button turns over one card per active player each round. The engine—not the player—places each card into that player's private YES or NO pile according to the authored identity matrix. After three reveals, players may risk one of three exact guesses or continue gathering evidence. The third wrong guess eliminates the player.

The earliest correct round wins. All decisions in a round resolve simultaneously; submission order, seating order, animation speed, and network arrival order do not decide victory. Multiple correct players in the earliest round are co-winners. If every player is eliminated, the match ends without a winner. Casual mode calculates and displays no score.

The standard screen emphasizes vague starting information, the central reveal action, the newest card, YES and NO piles, remaining guesses, a private identity board, opponent progress, and the guess decision. Light assist provides private Possible, Unlikely, and Eliminated markings. Full assist filters identities against the player's known YES/NO evidence; Off provides no deduction assistance.

### Active content and validation

`The Abdominal Mystery` is the initial tutorial-sized pack: 12 identities, 18 reveal cards, a complete strict boolean matrix, and a three-reveal guess threshold. Automated validation rejects missing non-boolean results, duplicate full signatures, identities with too little YES/NO variety, and cards that fail to divide the pool. Content remains `medicalReviewRequired`; simplified profiles are gameplay abstractions, not representations of real diagnostic certainty.

The engine is data-driven and separate from case content. New packs require identities, reveal cards, a YES/NO matrix, explanations, and review rather than engine changes. Match seeds reproduce identity assignment and per-player deck order. Duplicate identities are disabled by default.

### Current identity-mode limitations

- The first pack is tutorial-sized rather than the planned 20–24 identity Standard pack.
- Deck construction is seeded and strength-tiered with alternating YES/NO opportunities, but its deduction curve still needs statistical simulation and playtesting.
- The local UI runs one human versus one Balanced bot. The engine supports 2–4 player definitions, but online transport and multi-device synchronization are not implemented.
- Cosmetic achievements and illustrations are not yet included.
- The recap exposes identities, guesses, and YES/NO evidence, but richer card-by-card educational explanations await professional content review.

## Historical score-mode specification

The remainder of this document describes the superseded score-mode implementation retained for a possible future advanced mode. It is not the current Casual ruleset.

## Why the gameplay changed

The first vertical slice proved that versioned case content, deterministic rules, local persistence, and a React interface could work together. Its player loop, however, resembled a clinical decision simulator: players managed Focus, a Care Budget, numerical stability, delayed tests, treatments, ranked differentials, and a long Case Call. That asked beginners to understand too many medical and resource systems before the deduction became enjoyable.

The current direction replaces that player experience with a short competitive card game. Players still discover medically coherent clues from an authored fictional case, but the interaction is choosing one card, revealing a clue, and deciding when to diagnose. The route to the answer changes; the authored medical truth does not.

The former cooperative clinical loop is superseded for active gameplay. Its useful engineering and content decisions remain historical references, and the previous engine may remain isolated while migration is completed.

## Audience and experience goals

Meducktion is designed for teen and adult casual players, friends, card-game fans, and people curious about medical mysteries. No medical background is assumed. The game should feel like a polished deduction card game, a light competitive party game, and a cozy mystery that happens to teach useful ideas.

It should not feel like a medical-school examination, hospital simulator, electronic health record, or detailed patient-management game. Main-interface clues and conditions use plain language; optional `Learn more` content can explain carefully reviewed terminology.

## The one-minute rules

1. Every player investigates the same fictional patient and receives three cards.
2. Choose one Ask, Check, Test, or Special card, then lock it.
3. After everyone locks, reveal the cards and collect public or private clues.
4. From Round 2 onward, diagnose by choosing one of four conditions and two known clues.
5. A wrong diagnosis costs 150 points but does not eliminate the player.
6. Play up to four rounds. The highest final score wins.

The canonical loop is:

```text
Meet the patient
→ receive three cards
→ choose and lock one card
→ reveal all played cards
→ receive and review clues
→ diagnose or continue
→ draw back to three cards
→ repeat for up to four rounds
→ compare scores
```

MVP defaults are 2–4 player-compatible rules, one human versus one Balanced bot for local testing, four rounds, a three-card hand, one card per player per round, diagnosis after Round 2, no strict timer, and no more than two diagnosis attempts. The target match length is 6–10 minutes.

## Card categories

Only four categories are active:

| Category | Purpose | Presentation |
|---|---|---|
| Ask | Reveals history, symptoms, or the patient's account | Warm yellow/orange with category text and icon |
| Check | Reveals a simple examination or observation | Teal with category text and icon |
| Test | Reveals a stronger objective clue immediately | Blue/purple with category text and icon |
| Special | Adds limited card-game variety, such as drawing, swapping, repeating, or sharing | Pink/gold with category text and icon |

Cards are authored data, not React conditionals. Each definition has a stable ID, name, category, short description, icon key, case compatibility, clue or effect, visibility, and duplicate policy. Rarity and a beginner hint are optional. Test cards are less common than Ask and Check cards, and the MVP has no more than five Special effects.

Every opening hand contains at least one Ask, one Check, and one Test or Special card. Each player gets one full-hand redraw. A simple deterministic protection rule favors a useful compatible card after two rounds without a meaningful undiscovered clue.

## Public and private information

Everyone sees the patient introduction, four possible conditions, round, shared event, public clue board, opponents' played card categories, and whether an opponent diagnosed. A player alone sees their hand, private clues, diagnosis choices, submission, and unused redraw. Opponent scores and private investigation paths are revealed only in the recap.

Cards may explicitly share a clue. The MVP does not allow unrestricted player-written clues, free-form medical reasoning, or bluffing about authored clue text.

## Controlled randomness

The MVP has exactly three primary randomness sources:

- A separately shuffled player deck made from the same case-compatible card pool.
- One authored presentation variant selected at match creation. The architecture supports multiple variants; only medically reviewed variants should ship.
- One simple shared event revealed in Round 2 or 3, selected from a small authored pool such as Patient Remembers, Second Look, Clear Signal, or Helpful Nurse.

A seeded pseudo-random generator drives deck order, initial hands, draws, event selection, and seeded bot tie-breaks. Match state stores the seed. The same case, content version, variant, seed, player definitions, and command sequence must reproduce the same match. Game-rule resolution must not call uncontrolled `Math.random()`.

Randomness never changes the diagnosis, medical meaning of a clue, correctness of a submission, scoring rules, or authored result of an investigation. It changes the investigation route, not the truth.

## Match state machine

The active card engine follows this serializable lifecycle:

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

Selection may change before locking and never reveals a clue. All active players must lock before resolution. Reveal applies card effects, places clues according to visibility, resolves the one shared event at its authored round, and draws active hands back to three. A player who diagnosed correctly remains present as a spectator. A player who used both attempts without solving the case keeps playing cards for discovery points, but cannot diagnose again.

The match ends when all players have diagnosed correctly or exhausted their attempts, or after every eligible player has made the required Round 4 final call. Completion reveals correctness, private clues, investigation paths, scores, ranking, winner feedback, and a beginner-friendly educational explanation.

## Diagnosis and scoring

A diagnosis submission contains one of the four match conditions and two distinct clues known to that player, whether private or public. Diagnosis is unavailable before Round 2. A correct player cannot resubmit. The first wrong attempt subtracts 150 points and blocks another attempt until the next round; the second wrong attempt subtracts another 150 points and exhausts attempts. Players may keep revealing cards for partial points and are never eliminated.

The maximum score is 1,000:

| Category | Maximum | Rule |
|---|---:|---|
| Correct diagnosis | 500 | 500 for correct; otherwise 0 |
| Supporting clues | 200 | 100 for each selected clue that legitimately supports the correct diagnosis |
| Timing | 150 | 150 after Round 2, 100 after Round 3, 50 after Round 4 |
| Efficient investigation | 100 | Starts at 100; repeated no-new-clue or clearly irrelevant investigations subtract 20 each |
| Special achievement | 50 | At most one authored achievement |

Wrong-attempt penalties apply after category scoring, and the result is clamped to 0–1,000. Ranking compares correct diagnosis, total score, evidence score, earlier correct round, fewer wrong attempts, and more unique discoveries, in that order. If every skill-based measure is still identical, a deterministic mystery draw derived from the match seed chooses the unique first-place player. Submission order and player order never break the tie, so going first gives no ranking advantage. The result records and displays the criterion that actually decided first place.

## Local bot behavior

The local vertical slice uses one Balanced bot so a single browser can exercise the competitive loop. The engine remains compatible with 2–4 player definitions. The bot:

- Reads only its own hand, its private clues, and public match information.
- Prefers cards that reveal a meaningful clue it has not seen.
- Selects and locks a card that is actually in its hand.
- Uses authored clue-support counts when deciding whether and what to diagnose.
- Follows the same phase, clue, attempt, and timing validation as a human.
- Uses the stored seed for deterministic tie-breaking.
- Waits for the local human to diagnose or continue before making its diagnosis decision.

The bot is a transparent test opponent, not a simulation of medical expertise or a complex AI system.

## Visual direction

The visual tone is roughly 40% playful, 30% cozy, 20% mysterious, and 10% medical. The app uses a prominent illustrated patient, a cozy stylized clinic setting, large colorful cards, rounded condition tiles, friendly icons, soft gradients, gentle shadows, visible round progress, satisfying clue reveals, and restrained winner celebration.

Ask, Check, Test, and Special cards always include category text and icons, so color is supplementary. The interface avoids dense dashboards, realistic hospital software, tiny clinical labels, graphic anatomy, harsh alarm styling, tables of developer data, and walls of text.

The responsive experience keeps the patient, conditions, shared clues, opponent state, hand, and primary action understandable at mobile, tablet, and desktop widths. Card choice, diagnosis, and tutorial controls are keyboard accessible; selected and locked states are textual; reveals/errors use live announcements; reduced motion is supported; and no interaction requires drag-and-drop.

## Active architecture and legacy engine

The competitive rules belong in a separate framework-independent card-engine namespace with strict serializable state, immutable commands, deterministic events, structured errors, seeded random state, and one public pure transition function. React renders engine state and dispatches commands through the session boundary; it must not duplicate card resolution, diagnosis validation, bot rules, or scoring.

Useful work retained from the first slice includes the React/Vite and strict TypeScript setup, case registry and validation, stable case and clue IDs, Jordan Lee and medically coherent appendicitis clues, content/schema versions, medical review statuses, deterministic transition pattern, structured events/errors, snapshot versioning, local-storage adapter pattern, accessibility foundations, and test infrastructure.

The former Care Interval engine is legacy. Its Focus, Care Budget, numerical stability, delayed-test queue, treatment/progression, differential ranking, Case Call, urgency, and safety-score rules are not active card-game dependencies and must not appear in the normal interface. Legacy tests may continue to protect historical code until an explicit removal decision; files and documentation that describe that engine are historical unless the active card-engine documentation links to them.

## Persistence changes

Card matches use a new versioned snapshot and the storage key `meducktion:card-match`. A snapshot pins the match ID, case/variant and content versions, seed, players, current phase and round, each deck position and hand, locked selections, clues by visibility, event state, diagnosis attempts/submissions, scores, applied command IDs, event sequence, and revision.

Resume must recreate the match exactly and reject corrupt or incompatible snapshots safely. Temporary animation, open-panel, hover, and form state remains in React and is not persisted. A snapshot under the former `meducktion:solo-session` rules is not resumed as a card match. The UI should explain that the rules changed and offer a new match; it must never crash or silently reinterpret legacy state.

## Future multiplayer boundary

### Multiplayer foundation implemented

The first transport slice is now present under `src/firebase` and `src/multiplayer-room`. It adds lazy Firebase Web SDK configuration, anonymous sign-in, explicit Auth/Firestore emulator connections, six-character room codes, versioned lobby records, 2–4 member capacity, readiness, host-only start, expiry, real-time subscriptions, and transactional command submission. Room transitions reuse `CardMatchCommandEnvelope` and `applyCardMatchCommand`; Firebase does not select cards, reveal clues, validate diagnoses, run bots, or score matches.

Firestore rules permit authenticated users to read a lobby in order to join, prohibit room listing, restrict initial creation to the authenticated host, cap membership, preserve pinned room fields, and deny nonmember reads after play begins. Emulator-backed rules tests are included separately from the normal Vitest suite. They require JDK 21 or newer because of the current Firebase CLI requirement.

This slice is infrastructure, not a complete online UX. Create/join lobby screens, reconnect presentation, host migration, per-player private-state partitioning, and two-browser end-to-end testing remain next. The current full session snapshot is member-readable and therefore suitable only for casual private-room prototyping, not ranked cheat resistance.

Firebase networking remains outside the engine. The engine knows nothing about Firebase, browser clocks, presence, authentication, transport retries, or server timestamps. The room adapter transmits validated commands and versioned snapshots and enforces expected revisions and command idempotency. It must not resolve cards, inspect private clues for unrelated players, choose bot actions, recalculate scores, or alter authored medical truth.

Before wider online play, the team must finish authoritative security boundaries for hidden information, concurrent locking, reconnects, host migration, and cheating resistance. Cloud Functions and matchmaking are not implemented.

## First converted case

`The Pain That Moved` retains Jordan Lee, age 20, and an authored appendicitis answer. The beginner answer set is Appendicitis, Stomach infection, Urinary infection, and Kidney stone. Plain-language clue cards adapt the validated history, movement of pain, appetite, diarrhea, lower-right tenderness, mild fever, blood, urine, and ultrasound findings. Detailed terms may appear only in optional reviewed explanations.

Stable case and clue IDs remain unchanged unless a deliberate content migration is versioned and documented. The case remains fictional and requires medical review before public release.

## Small polish pass

The first post-playtest polish pass intentionally stayed in the presentation layer. Cards now state whether their clue will be shared or private before selection, and revealed clue rows repeat that visibility instead of relying only on board placement. The diagnosis control now uses round-aware wording, while the post-reveal area presents `Diagnose now` and `Keep investigating` as one clear decision. The tutorial mentions the free redraw and the recurring diagnose-or-continue choice. Results now summarize the human player's placement and diagnosis outcome immediately, with their score breakdown open by default.

### Remaining playtest observations

- The one-human/one-bot pacing should be tested with more first-time players, especially the transition from reveal to diagnosis.
- Card and diagnosis-panel readability still needs hands-on checks at narrow mobile widths and high text zoom.
- The current bot presentation is understandable but intentionally lightweight and may benefit from more personality after broader playtesting.

### Future ideas not implemented

No new game rules, cards, modes, medical systems, or gameplay randomness were added in the presentation polish pass. The later multiplayer foundation is documented separately above.

## Recommended Core Rules v2 migration status

The first safe v2 rules slice addresses fairness and match completion without replacing the current card loop:

- Cards resolve as a simultaneous round for discovery credit. If multiple players reveal the same previously hidden public clue in that round, every contributor receives credit while the shared board stores the clue once.
- Using the second diagnosis attempt no longer removes a player from card play. They continue investigating for discovery points.
- An eligible player cannot skip the Round 4 final diagnosis. The interface directs them to make their call before completion.
- First place is always unique. The engine records the actual ranking criterion, and the results screen explains it.

Remaining v2 work is deliberately staged rather than folded into this narrow engine migration. A variable hidden diagnosis requires a fully authored and medically reviewed clue matrix for every possible outcome. Player-controlled keep/swap decisions, choice-driven event cards, weighted evidence, revised positive scoring, public Test cards, generic Tactics, bot strategy changes, and result-aware bad-luck protection remain unimplemented. Those changes affect content contracts, balance, tutorial copy, and saved-state compatibility and should be developed as a separately versioned slice with dedicated playtesting.

## Current limitations

- Multiplayer is locally simulated with a bot; there is no online room or human-to-human networking.
- Bot behavior is intentionally simple and is not a competitive production AI.
- The first case provides limited replay variety; additional variants require medically responsible authoring and review.
- The competitive 2–4 player architecture still needs real multi-device synchronization and playtesting.
- Professional medical review and release authority remain pending.
- Accessibility and responsive behavior require continued manual browser verification in addition to automated tests.
- Client-side game state is inspectable; future online competitive integrity needs an authoritative design.
- Meducktion is a working title and still requires trademark, domain, social-handle, app-store, and other platform-availability review before public release.

## Historical references

The stable `CASE_SIGNAL_*` filenames are retained to avoid breaking links. Requirements in the current [PRD](CASE_SIGNAL_PRD.md), [MVP specification](CASE_SIGNAL_MVP.md), and this document govern the card game. The [decision log](CASE_SIGNAL_DECISIONS.md), [legacy engine contract](CASE_SIGNAL_ENGINE.md), [first UI vertical slice](CASE_SIGNAL_UI_VERTICAL_SLICE.md), and [paper playtest](cases/THE_PAIN_THAT_MOVED_PLAYTEST.md) preserve useful rationale but describe the superseded clinical/cooperative loop where they conflict with current requirements.
