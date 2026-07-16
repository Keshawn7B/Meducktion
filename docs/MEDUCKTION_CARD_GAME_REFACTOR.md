# Meducktion Competitive Card Game Refactor

## Current race rules and expanded case catalog

Meducktion now uses a direct deduction race instead of point scoring. A player may diagnose during any card-selection or diagnosis window, including Round 1. The first correct diagnosis ends the match immediately and is the sole winner. Submission order matters only when a correct command is accepted; there is no score calculation or first-place tie. On the first wrong diagnosis, the player chooses whether to hide their YES or NO evidence pile. The second wrong diagnosis hides both piles. The third eliminates that player. Each wrong guess blocks another attempt until the next round.

The authored draft catalog contains 25 fictional scenarios. Every scenario presents eight plausible, deliberately overlapping possibilities and uses the same 23 generic symptom and homeostasis questions. Dehydration remains a possible diagnosis but is not treated as a symptom-question card. Up to four core conditions are authored per scenario; any condition with an identical 23-answer profile is excluded from that match, then the closest distinct reviewed profiles fill the eight-option differential. The eight choices are shuffled from the match seed, so the answer position varies between matches while remaining identical for every player and stable after refresh. Every question produces a private YES or NO answer. Each player deck contains exactly one copy of each question, so a player cannot draw a duplicate card during a match. The consistent vocabulary is intentional: players learn the deck while different combinations of answers create the deduction challenge. Three blind guesses can cover at most 37.5% of the diagnosis pool, with escalating evidence loss after each miss.

Players do not choose from or preview named scenarios. Local matches draw a case from the 25-case catalog using the match seed. A new online room randomly selects and stores one case and seed so every client receives the identical mystery. A rematch randomly selects a different case from the one just completed, then pins that new case for all room members. The patient and mystery are revealed only after the match starts; authored case titles remain internal content metadata.

The expanded profiles are marked `medicallyApproved` following the July 2026 review. Difficulty, ambiguity, answer balance, and bot behavior still require structured playtesting.

**Status:** Current product and architecture direction

**Tagline:** *Reveal. Deduce. Diagnose.*

> **Medical disclaimer:** Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.

## July 2026 deduction-loop correction

This section is the authoritative description of the currently mounted game. Older identity-mode and score-mode sections below are retained as historical design records where they conflict with this correction.

The default mode is the shared-patient competitive card game. Two to four players investigate the same fictional case, choose one of three question cards, and reveal authored answers into their own private YES and NO evidence piles. Local play uses one deterministic bot; private online rooms use the same engine and session contract for human players.

Players take card turns in seat order, and the starting seat rotates each round so the same player does not always act first. Only the active player may choose, redraw, or reveal a card; revealing passes play to the next active seat. The choice remains reversible until the next player begins choosing. When the final active player reveals, the round resolves automatically, places each answer into its owner's private pile, and prepares the next hand. A player may diagnose from Round 1. A limited match ends without a winner if Round 10 finishes without a correct diagnosis. If eliminations leave only one player, that remaining player wins immediately.

Question cards use short, generic symptom and homeostasis checks such as `Fever?`, `Nausea?`, `Urine clear?`, `Blood sugar normal?`, and `Cough?`. Their case-specific YES or NO answer is fixed case content, never random medical truth. Ask, Check, and Test are presentation types only; the active decks contain no Special cards and no cards that directly reveal the diagnosis.

Twenty-five fictional deduction cases are currently registered. They share a 24-question vocabulary but use different overlapping answer profiles and eight-condition sets. Their medical profiles are approved; balance and clarity remain subject to playtesting.

### Card and table polish

- Each player's results appear in separate private YES and NO piles with the original question and authored answer.
- Question cards use a large text-first face with no illustration or visibility label, keeping the question readable at desktop and mobile sizes.
- Card copy stays inside the portrait face because only the short question and YES/NO outcome preview are shown.
- Selecting a card visually mutes the other two without disabling them, so the player can still change their choice before revealing it.
- Opponent answers remain hidden; only the played question type and the fact that an answer was received are shown.
- Local setup exposes the full case registry. An online room randomly selects one registered case when created and pins it for the active match; rematches exclude the immediately previous case.
- Online `Play Again` resets the completed match to the same lobby instead of deleting the room or returning home.

### Remaining playtest observations

- The three new draft cases need professional medical review, copy editing, and repeated balance testing.
- The YES/NO information curve needs multiplayer playtesting to confirm that neither fast diagnosis nor repeated Test draws dominate.
- Unlock is available only before the final player locks; the final lock intentionally starts the automatic reveal.
- Online play remains a trusted-room, client-authoritative MVP rather than a cheat-resistant ranked system.

### Future ideas not implemented

No Firebase authority service, matchmaking, ranked mode, new medical subsystem, complex randomness system, or additional card category was added in this correction.

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
2. On your turn, choose one Ask, Check, or Test question, then lock it to pass play clockwise.
3. After every active player has taken one turn, reveal the cards and privately sort each answer into YES or NO.
4. Diagnose whenever you are ready by choosing one of eight conditions.
5. The first miss hides one chosen evidence pile; the second hides both; the third eliminates you.
6. The first correct diagnosis wins immediately.

The canonical loop is:

```text
Meet the patient
→ receive three cards
→ choose and lock one card
→ reveal all played cards
→ receive and review clues
→ diagnose or continue
→ draw back to three cards
→ repeat for up to ten rounds
→ first correct diagnosis wins
```

Current defaults are 2–4 player-compatible rules, one human versus one Balanced bot for local testing, a three-card hand, one card per player per round, diagnosis from Round 1, no strict timer, and no more than three diagnosis attempts. Online room hosts choose either a ten-round limit or unlimited rounds.

## Card categories

Three question categories are active:

| Category | Purpose | Presentation |
|---|---|---|
| Ask | Reveals history, symptoms, or the patient's account | Warm yellow/orange with category text and icon |
| Check | Reveals a simple examination or observation | Teal with category text and icon |
| Test | Reveals a stronger objective clue immediately | Blue/purple with category text and icon |

Cards are authored data, not React conditionals. Each active definition has a stable ID, short symptom or homeostasis question, Ask/Check/Test category, case compatibility, one authored YES/NO clue, private visibility, and duplicate policy. Test cards are less common than Ask and Check cards. Special-card effect types remain historical engine capability but are absent from active case decks.

Every opening hand contains at least one Ask, one Check, and one Test card. Each player gets one full-hand redraw. A simple deterministic protection rule favors a useful compatible card after two rounds without a meaningful undiscovered answer.

## Public and private information

Everyone sees the patient introduction, eight possible conditions, round status in the match header, whose turn it is, table event, opponents' played card categories, and whether an opponent diagnosed. The patient card itself does not display round progress. A player alone sees their hand, private YES/NO piles, diagnosis choices, submission, and unused redraw. The active cases produce no shared clues. Opponent answers and investigation paths remain hidden until the recap.

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

Selection may change before revealing and does not expose the answer until the round resolves. Card selection proceeds through `playerOrder`, with off-turn card commands rejected. After every active player has revealed one card, resolution places a private YES or NO answer for each played question and draws active hands back to three. A player eliminated by a third wrong diagnosis no longer participates in card rounds.

The match ends immediately when the first correct diagnosis command is accepted. If nobody solves it by the final required calls, the case ends without a winner. Completion reveals the authored answer, investigation paths, winner feedback, and a beginner-friendly educational explanation. Every diagnosis now has its own concise definition and list of common symptoms; a separate note makes clear that symptoms vary and that the game is not a diagnostic tool.

## Diagnosis and victory

A diagnosis submission contains one of the eight match conditions. It is available whenever the player is choosing a card or the diagnosis window is open. The first correct submission ends the match and names exactly one winner. After the first wrong attempt, the player must choose a YES or NO pile to hide before play can continue. The second wrong attempt hides both piles automatically. The third eliminates the player; if only one player remains, that player wins. There are no points or score-based tie breakers.

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

Ask, Check, and Test cards include category text and icons, so color is supplementary. Their faces prioritize one large question plus a YES/NO outcome preview and omit decorative artwork. The interface avoids dense dashboards, realistic hospital software, tiny clinical labels, graphic anatomy, harsh alarm styling, tables of developer data, and walls of text.

The responsive experience keeps the patient, conditions, private evidence piles, opponent state, hand, and primary action understandable at mobile, tablet, and desktop widths. Card choice, diagnosis, and tutorial controls are keyboard accessible; selected and locked states are textual; reveals/errors use live announcements; reduced motion is supported; and no interaction requires drag-and-drop.

## Active architecture and legacy engine

The competitive rules belong in a separate framework-independent card-engine namespace with strict serializable state, immutable commands, deterministic events, structured errors, seeded random state, and one public pure transition function. React renders engine state and dispatches commands through the session boundary; it must not duplicate card resolution, diagnosis validation, bot rules, or scoring.

Useful work retained from the first slice includes the React/Vite and strict TypeScript setup, case registry and validation, stable case and clue IDs, Jordan Lee and medically coherent appendicitis clues, content/schema versions, medical review statuses, deterministic transition pattern, structured events/errors, snapshot versioning, local-storage adapter pattern, accessibility foundations, and test infrastructure.

The former Care Interval engine is legacy. Its Focus, Care Budget, numerical stability, delayed-test queue, treatment/progression, differential ranking, Case Call, urgency, and safety-score rules are not active card-game dependencies and must not appear in the normal interface. Legacy tests may continue to protect historical code until an explicit removal decision; files and documentation that describe that engine are historical unless the active card-engine documentation links to them.

## Persistence changes

Card matches use a new versioned snapshot and the storage key `meducktion:card-match`. A snapshot pins the match ID, case/variant and content versions, seed, players, current phase and round, each deck position and hand, locked selections, clues by visibility, event state, diagnosis attempts/submissions, scores, applied command IDs, event sequence, and revision.

Resume must recreate the match exactly and reject corrupt or incompatible snapshots safely. Temporary animation, open-panel, hover, and form state remains in React and is not persisted. A snapshot under the former `meducktion:solo-session` rules is not resumed as a card match. The UI should explain that the rules changed and offer a new match; it must never crash or silently reinterpret legacy state.

## Online multiplayer

### Lobby and synchronized match implemented

The transport, lobby, and live-match slice is present under `src/firebase`, `src/multiplayer-room`, and `src/multiplayer-lobby`. The home screen offers separate local and online entry points. Online players can create a private room, select two to four seats, share or enter a six-character room code, join anonymously, see live membership, toggle their own ready state, leave without keeping a ghost seat, and let the host start a fully ready match. Firebase initialization remains lazy, so local play and ordinary UI tests do not contact Firebase.

The host creates one deterministic all-human engine session from the room's pinned case, content version, seed, and member order. Every card selection, redraw, lock, reveal acknowledgement, diagnosis, and round transition travels through the existing command envelope and Firestore transaction boundary. The repository normalizes sequence and revision values against the latest snapshot, preventing concurrent clients from accidentally overwriting a newer transition while command IDs retain idempotency. React builds the table from the authenticated player's ID and never renders another player's hand, private clue text, or diagnosis choice.

Round progression is multiplayer-aware. Every active player takes one card turn in seat order, all players acknowledge the reveal before diagnosis opens, and each player either diagnoses or explicitly keeps investigating before the room advances. In ten-round rooms, the match completes with no winner after the Round 10 decisions when nobody diagnosed correctly. Unlimited rooms advance beyond Round 10. The room code is retained locally so a refresh can restore the subscription after Firebase restores the anonymous identity. If a lobby host leaves, ownership transfers deterministically to the next seated player. If someone explicitly leaves an active match, their engine seat becomes a Balanced bot and completes any pending turn, reveal acknowledgement, or diagnosis decision so the room cannot be stranded.

Firebase networking remains outside the engine. The engine knows nothing about Firebase, browser clocks, presence, authentication, transport retries, or server timestamps. The room adapter transmits validated commands and versioned snapshots and enforces expected revisions and command idempotency. It must not resolve cards, inspect private clues for unrelated players, choose bot actions, recalculate scores, or alter authored medical truth.

This remains an unranked, trusted-room MVP. The complete deterministic session currently lives in the member-readable room snapshot, so a member can inspect hidden state through developer tools even though the interface keeps it hidden. Before ranked or public competitive play, split authority and player-private state behind a trusted server or host-authority partition and run a two-browser emulator/E2E suite. Cloud Functions and matchmaking are not implemented.

### Production Firestore status

The room rules were compiled and deployed to Firebase project `meducktion` on July 14, 2026. Emulator coverage verifies authenticated lobby joins, own-readiness updates, host-only starts, deterministic host transfer, member-scoped presence heartbeats, timed-out seat replacement, active member transitions, and denial of unauthenticated or outsider access. A disposable production smoke test used two isolated anonymous users to create and join a room, ready the guest, create the pinned all-human session, start the match, play cards from both clients, observe the synchronized reveal transition, and delete the room afterward.

### Final multiplayer polish

The active table now keeps the private room code and a Live, Syncing, or Offline indicator visible without reopening the lobby. Interactive card, redraw, lock, reveal, diagnosis, continue, and rematch controls pause while a Firestore command is in flight or the browser reports that it is offline, which prevents accidental duplicate commands and gives the player a clear recovery signal. Leaving an active match requires confirmation and retains the existing deterministic bot takeover. When a room member chooses Play Again after completion, a transaction returns the existing room to its lobby, clears the finished session, and pins a newly randomized case that cannot repeat the immediately previous mystery.

Active matches now maintain presence in a dedicated Firestore subcollection so heartbeats never change the deterministic room session or command revision. Each player refreshes their server-timestamped presence every 15 seconds and when returning to a visible tab. Opponents first show Reconnecting; after a 90-second grace period, a remaining member transactionally converts the stale human seat to the existing Balanced bot and continues any pending reveal or diagnosis transition. A player who returns after takeover receives a clear explanation instead of being allowed to control the bot seat. Offline play cannot progress until connectivity returns.

## First converted case

`The Pain That Moved` retains Jordan Lee, age 19, and an authored appendicitis answer. Its authored differential begins with Appendicitis, Viral gastroenteritis, Urinary infection, and Kidney stone. Because the reviewed Appendicitis and Viral gastroenteritis profiles are identical across the current 23 questions, Viral gastroenteritis is excluded from this particular match and the catalog fills all remaining slots with the closest distinct reviewed profiles. The current YES/NO profiles reflect the medically approved July 2026 review recorded in `MEDUCKTION_MEDICAL_CONTENT_REVIEW.md`.

Stable case and clue IDs remain unchanged unless a deliberate content migration is versioned and documented. The cases remain fictional and are not medical advice.

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

- Players choose cards sequentially in seat order; after everyone has taken a turn, the locked cards resolve together. Each player receives their own private copy of the authored YES/NO answer, even when opponents chose the same question.
- Using the second diagnosis attempt no longer removes a player from card play. They continue investigating for discovery points.
- A ten-round match ends with no winner if Round 10 finishes without a correct diagnosis. Unlimited rooms continue until someone diagnoses correctly or eliminations leave one player, who wins immediately.
- First place is always unique. The engine records the actual ranking criterion, and the results screen explains it.

Remaining v2 work is deliberately staged rather than folded into this narrow engine migration. A variable hidden diagnosis requires a fully authored and medically reviewed clue matrix for every possible outcome. Player-controlled keep/swap decisions, choice-driven event cards, weighted evidence, revised positive scoring, public Test cards, generic Tactics, bot strategy changes, and result-aware bad-luck protection remain unimplemented. Those changes affect content contracts, balance, tutorial copy, and saved-state compatibility and should be developed as a separately versioned slice with dedicated playtesting.

## Current limitations

- Online rooms synchronize complete two-to-four-player matches, but remain client-authoritative trusted rooms rather than cheat-resistant ranked play.
- Bot behavior is intentionally simple and is not a competitive production AI.
- The first case provides limited replay variety; additional variants require medically responsible authoring and review.
- The competitive 2–4 player flow still needs broader real-device latency, disconnect, and refresh playtesting.
- Medical profile review is complete; balance and clarity remain subject to playtesting.
- Accessibility and responsive behavior require continued manual browser verification in addition to automated tests.
- Client-side game state is inspectable; future online competitive integrity needs an authoritative design.
- Meducktion is a working title and still requires trademark, domain, social-handle, app-store, and other platform-availability review before public release.

## Historical references

The stable `CASE_SIGNAL_*` filenames are retained to avoid breaking links. Requirements in the current [PRD](CASE_SIGNAL_PRD.md), [MVP specification](CASE_SIGNAL_MVP.md), and this document govern the card game. The [decision log](CASE_SIGNAL_DECISIONS.md), [legacy engine contract](CASE_SIGNAL_ENGINE.md), [first UI vertical slice](CASE_SIGNAL_UI_VERTICAL_SLICE.md), and [paper playtest](cases/THE_PAIN_THAT_MOVED_PLAYTEST.md) preserve useful rationale but describe the superseded clinical/cooperative loop where they conflict with current requirements.
