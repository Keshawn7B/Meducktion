# Meducktion

**Reveal the clues. Solve the case. Outsmart the room.**

Meducktion is a beginner-friendly competitive medical mystery card game. Investigate the same fictional patient as your opponents, choose one card each round, collect public and private clues, and decide when you know enough to diagnose. The current local vertical slice plays one human against a deterministic bot; its framework-independent rules are designed for 2–4 players.

> **Medical disclaimer:** Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.

## Run locally

Prerequisite: a current Node.js/npm installation.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. `Play` starts a locally simulated match against a Balanced bot. Firebase networking, authentication, online rooms, and human-to-human multiplayer are not implemented.

## Verify

```powershell
npm run typecheck
npm test
npm run validate:cases
npm run build
```

## Current product documentation

- [Competitive card-game refactor](docs/MEDUCKTION_CARD_GAME_REFACTOR.md)
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
