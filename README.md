# Meducktion

**Reveal. Deduce. Diagnose.**

Meducktion is a beginner-friendly hidden-identity medical deduction game. Every player has a different hidden patient identity. Reveal one symptom each round; the game automatically sorts it into your private YES or NO pile. Use both piles to eliminate possibilities, then risk one of three exact guesses before an opponent solves their patient. The current local vertical slice plays one human against a deterministic bot; its framework-independent rules support 2–4 players and simultaneous decisions.

> **Medical disclaimer:** Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.

## Run locally

Prerequisite: a current Node.js/npm installation.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. `Play` starts the current local card match. A first online-room foundation now provides anonymous Firebase authentication, transactional Firestore room storage, lobby membership/readiness, and command synchronization behind the existing deterministic session boundary. The player-facing create/join lobby is not connected yet.

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

The current Firebase CLI requires JDK 21 or newer for the Firestore emulator. Production credentials are not included in the repository.

## Current product documentation

- [Identity-casual game refactor](docs/MEDUCKTION_CARD_GAME_REFACTOR.md)
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

The first case remains pending professional medical review. Meducktion is an official working title, not a cleared public name; trademark, domain, social-handle, app-store, and other platform availability must be reviewed before release.
