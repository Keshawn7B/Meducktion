# CASE//SIGNAL Case Authoring Guide

## Identity and versioning

Use lowercase dotted kebab-case IDs: `case.the-pain-that-moved`, `variant.classic`, `diagnosis.appendicitis`, `clue.pain-started-central`, `action.history.pain-movement`, `test.blood-count`, and `treatment.supportive-fluids`.

- `caseId` is permanent after release. Never recycle it.
- `variantId` identifies a stable authored presentation.
- `schemaVersion` changes only when the content format changes.
- `contentVersion` changes for medical content, balance, results, scoring, or progression changes.
- Cosmetic-only replacement increments `assetRevision`; document attribution changes.
- Multiplayer rooms pin schema, case, variant, and exact content version. Active games never silently migrate.
- Retired content keeps its identity so match history remains interpretable.

## Authoring workflow

1. Define a fictional `PatientProfile`, chief complaint, starting/max stability, and disclaimer.
2. Define the true diagnosis and complete differential before clues. Explain why each candidate is initially plausible, supported, and weakened.
3. Write each clue as a qualitative authored observation. Give every diagnosis a Supports, Conflicts, or Unresolved relationship. Avoid “proves,” “always,” numerical diagnostic probabilities, or absolute exclusion.
4. Define actions through the appropriate discriminated type. Costs must create tradeoffs: common actions usually cost 1 Focus; complex actions may cost 2. A focused abdominal examination costs 1 Focus in this case as a gameplay abstraction—not a statement about real clinical effort.
5. For tests, declare delay, major-queue use, burden, pending text, result clues, duplicate rejection, and case-end cancellation. A delay-1 test ordered now first decrements next interval.
6. Define progression as serializable conditions and effects, never executable functions. Specify every interval, deterministic deltas, warnings, spontaneous reveals, stopping conditions, and terminal rules.
7. Telegraph complications with a prior warning. Every complication needs a trigger, preventer when applicable, stability effect, and clue reveal.
8. Guided hints should explain vocabulary, tradeoffs, and safety without identifying the true answer or automatically classifying evidence.
9. Configure scoring once. Category maxima must total 1,000; define integer rounding, bands, partial credit, and bounded penalties.
10. Run runtime validation and the schema test suite before review.

## Medical sourcing and review

Sources must support the authored pattern and known simplifications. Record citations, access dates, and notes. Required roles are Content author, Source checker, Qualified medical reviewer, Gameplay reviewer, and Release approver.

| Use | Minimum status/evidence |
|---|---|
| Local development | Draft; disclaimer present |
| Closed internal playtest | Draft; internal consistency check |
| External closed playtest | Source checked and Medical review required; visibly unapproved |
| Public release | Release approved after medical approval and gameplay testing |

Never infer professional approval from source checking or internal review. Retire content that is obsolete or unsafe; do not delete its identity.

## Common mistakes

- Changing a released ID or silently updating active rooms
- Omitting Unresolved relationships because a clue is neutral
- Hard-coding rules in display text instead of serializable fields
- Creating clues with no reveal path or dangling IDs
- Treating absence of one clue as absolute exclusion
- Making every test affordable or immediately available
- Applying progression in an undocumented order
- Hiding a complication without a warning
- Repeating scoring numbers in several structures
- Marking Draft content medically approved
- Adding realistic dosing, procedures, or personalized advice

## Approval checklist

- [ ] IDs are unique, stable, and convention-compliant.
- [ ] Schema/content/asset versions are correct.
- [ ] Patient and differential are internally consistent.
- [ ] Every discoverable clue has a reveal path and qualitative relationships.
- [ ] Costs, test timing, queue behavior, and duplicates are explicit.
- [ ] Every interval, warning, complication, and terminal path is deterministic.
- [ ] At least one successful and one safe resolution path exist.
- [ ] Case Call and scoring rules validate and total 1,000.
- [ ] Guided text is helpful without revealing the answer.
- [ ] Sources, simplifications, review records, and disclaimer are complete.
- [ ] Runtime validation and automated tests pass for the pinned content version.
