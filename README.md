# Meducktion

## CASE//SIGNAL planning

- [Product requirements](docs/CASE_SIGNAL_PRD.md)
- [MVP specification](docs/CASE_SIGNAL_MVP.md)
- [Architecture plan](docs/CASE_SIGNAL_ARCHITECTURE.md)
- [Development roadmap](docs/CASE_SIGNAL_ROADMAP.md)
- [MVP decision log](docs/CASE_SIGNAL_DECISIONS.md)
- [First-case paper playtest](docs/cases/THE_PAIN_THAT_MOVED_PLAYTEST.md)
- [Case authoring guide](docs/CASE_SIGNAL_CASE_AUTHORING.md)
- [Schema test specification](docs/CASE_SIGNAL_SCHEMA_TESTS.md)
- [First machine-readable case](src/case-content/cases/thePainThatMoved.ts)

## Development verification

This repository currently contains the CASE//SIGNAL content/schema validation foundation, not a playable web application.

```powershell
npm install
npm run typecheck
npm test
npm run validate:cases
```
