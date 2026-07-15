# Meducktion

**Reveal. Deduce. Diagnose.**

Meducktion is a beginner-friendly competitive medical deduction card game. Players investigate one of 25 fictional cases, choose one short Ask, Check, or Test question each round, privately sort its authored answer into a YES or NO pile, and narrow eight plausible conditions before diagnosing. Local play supports deterministic bots; private Firebase rooms support two to four human players.

> **Medical disclaimer:** Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.

## Run locally

Prerequisite: a current Node.js/npm installation.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. `Play Local` starts a bot match. `Play Online` creates or joins a private room, synchronizes the live match through Firestore, and resumes the room after refresh while the same anonymous Firebase identity is available.

## Verify

```powershell
npm run typecheck
npm test
npm run validate:cases
npm run build
```

## Multiplayer development

Copy `.env.example` to `.env.local` and keep `VITE_FIREBASE_USE_EMULATORS=true` for local work. The demo project ID cannot reach production Firebase resources.

```powershell
npm run firebase:emulators
npm run test:multiplayer
npm run test:firebase-rules
```

The current Firebase CLI requires JDK 21 or newer for the Firestore emulator. Online play uses transactional commands with revision and idempotency checks. The match header keeps the room code and connection state visible, and gameplay controls pause while a command is syncing or the browser is offline. Active players write isolated Firestore heartbeats every 15 seconds; after a 90-second reconnect grace period, another room member transactionally replaces a stale human seat with the deterministic bot so the match can continue. A departing lobby host transfers ownership to the next player, an explicit active-match exit triggers immediate bot takeover, and Play Again returns the completed room to the same lobby. It remains an unranked client-authoritative MVP because room members can inspect shared Firestore snapshots.

The checked-in Firestore rules are deployed to the `meducktion` Firebase project. A disposable two-user production smoke test verifies anonymous authentication, room creation/join/readiness, match start, cross-client selection and locking, and host cleanup.

## Current product documentation

- [Identity-casual game refactor](docs/MEDUCKTION_CARD_GAME_REFACTOR.md)
- [Medical content review packet](docs/MEDUCKTION_MEDICAL_CONTENT_REVIEW.md)
- [Product requirements](docs/CASE_SIGNAL_PRD.md)
- [MVP specification](docs/CASE_SIGNAL_MVP.md)
- [Case authoring guide](docs/CASE_SIGNAL_CASE_AUTHORING.md)
- [Schema test specification](docs/CASE_SIGNAL_SCHEMA_TESTS.md)
- [First machine-readable case](src/case-content/cases/thePainThatMoved.ts)

## Historical prototype references

The stable `CASE_SIGNAL_*` filenames are intentionally retained to avoid breaking repository links. The following documents preserve useful decisions from the superseded clinical/cooperative prototype; where they conflict with the current PRD, MVP, or refactor document, they are historical rather than active requirements.

- [Architecture plan](docs/CASE_SIGNAL_ARCHITECTURE.md)
- [Development roadmap](docs/CASE_SIGNAL_ROADMAP.md)
- [Decision log](docs/CASE_SIGNAL_DECISIONS.md)
- [Paper playtest](docs/cases/THE_PAIN_THAT_MOVED_PLAYTEST.md)
- [Legacy game-engine contract](docs/CASE_SIGNAL_ENGINE.md)
- [First solo UI vertical slice](docs/CASE_SIGNAL_UI_VERTICAL_SLICE.md)

## Release status

All 25 cases use medically reviewed fictional profiles. Balance and clarity still require ongoing playtesting. Meducktion is an official working title, not a cleared public name; trademark, domain, social-handle, app-store, and other platform availability must be reviewed before release.
