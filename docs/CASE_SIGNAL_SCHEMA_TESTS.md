# Meducktion Schema Test Specification

No TypeScript/test toolchain exists yet, so these tests are specifications for the future Vitest suite. No passing execution result is claimed.

## Valid-case contract

1. `validateCaseDefinition(thePainThatMoved)` returns `{ valid: true, errors: [] }`.
2. The case uses `CURRENT_CASE_SCHEMA_VERSION`, stable identity fields, Draft/medical-review-required status, and category maxima totaling 1,000.
3. Serializing the definition to JSON and validating the parsed value preserves validity.

## Required negative tests

| Mutation/fixture | Expected code and path |
|---|---|
| Missing `caseId` | `REQUIRED_FIELD`, `$.caseId` |
| Schema version 999 | `UNSUPPORTED_SCHEMA_VERSION`, `$.schemaVersion` |
| Duplicate clue ID | `DUPLICATE_ID`, duplicate clue path |
| Action reveals absent clue | `UNKNOWN_CLUE`, action result path |
| Clue references absent diagnosis | `UNKNOWN_DIAGNOSIS`, relationship path |
| Condition references absent action | `UNKNOWN_ACTION`, condition path |
| Final diagnosis absent | `UNKNOWN_FINAL_DIAGNOSIS`, `$.finalAnswer.diagnosisId` |
| Next step urgency disagrees | `FINAL_URGENCY_MISMATCH`, `$.finalAnswer.urgency` |
| Score maxima total 950 | `SCORE_MAXIMUM_TOTAL`, `$.scoring.categories` |
| Stability 101 | `INVALID_STARTING_STABILITY`, patient path |
| Maximum intervals 0 | `INVALID_MAX_INTERVALS`, mode path |
| Negative Focus/budget | `NEGATIVE_FOCUS_COST` / `NEGATIVE_BUDGET_COST` |
| Test delay 1.5 or −1 | `INVALID_TEST_DELAY` |
| Pending limit 0 | `INVALID_PENDING_LIMIT` |
| Attempt limit 0 | `INVALID_ATTEMPT_LIMIT` |
| Discoverable clue has no reveal path | `CLUE_WITHOUT_REVEAL_PATH` |
| Empty successful paths | `NO_SUCCESS_PATH` |
| Unknown status | `UNKNOWN_MEDICAL_STATUS` |

The validator must collect multiple independent errors in a single result and set `valid: false`; warnings alone must not invalidate content.

## Intentionally invalid miniature fixture

This nonexecuted fragment illustrates multiple failures; it is deliberately not a complete `CaseDefinition`:

```ts
const invalidCase = {
  schemaVersion: 999,
  caseId: "case.invalid-example",
  variantId: "variant.classic",
  status: "professionallyPerfect", // unknown
  patient: { startingStability: 120 },
  mode: { maximumCareIntervals: 0, maximumPendingMajorTests: 0, caseCallAttemptLimit: 0 },
  diagnoses: [{ id: "diagnosis.duplicate" }, { id: "diagnosis.duplicate" }],
  clues: [],
  differential: [],
  actions: [],
  nextSteps: [],
  progression: { warnings: [], complications: [], stages: [] },
  successfulResolutionPaths: [],
};
```

Expected results include `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_MEDICAL_STATUS`, `INVALID_STARTING_STABILITY`, three positive-limit errors, `DUPLICATE_ID`, `NO_SUCCESS_PATH`, and missing-required-field errors. Validation must not throw.

## Reference and reachability tests

- Exercise every `RuleCondition` variant, including nested `all`, `any`, and `not`.
- Confirm test result IDs, direct reveal IDs, interval reveal IDs, spontaneous clues, and complication clues all count as reveal paths.
- Confirm initially visible clues need no action path.
- Confirm warning and complication IDs referenced by stages exist.
- Confirm every successful-path action exists.

## Content regression assertions

Pin the first case's stable identity, starting stability 82, maximum five intervals, budget 8, Focus 2, queue limit 2, attempt limit 2, test delays 1/1/2, treatment effects 4/2/0 and 2/1/0, progression losses, Interval-5 complication −12, and six scoring maxima. Snapshot only serialized content intended as a deliberate content-version contract; avoid snapshots for incidental property order.
