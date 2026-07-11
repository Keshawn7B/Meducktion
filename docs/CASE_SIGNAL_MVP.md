# CASE//SIGNAL MVP Specification

## Objective

Build one polished vertical slice proving that the deduction loop is understandable, strategically interesting, safe in tone, and enjoyable. The MVP validates the loop before content expansion.

> CASE//SIGNAL is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. It must not be used to make decisions about real patients.

## Included scope

- React and TypeScript web game with responsive desktop/mobile UI
- Existing Firebase room system where reusable; Firebase Spark compatibility
- Solo, Practice, and cooperative private-room play
- Anonymous authentication
- One complete Guided-difficulty case
- Two Focus per Care Interval and deliberate action locking
- Patient stability, authored deterioration, and one complication trigger
- Evidence cards and ranked differential with Supports/Conflicts/Unresolved classification
- Test costs, delays, duplicate rules, and pending-test limit
- Supportive treatment, complete Case Call, 1,000-point scoring, and educational debrief
- Visible fictional-game disclaimer

## Explicit exclusions

Public matchmaking, ranked multiplayer, doctor roles, user-created or AI-generated cases, progression trees, voice chat, spectators, paid APIs, Cloud Functions, Cloud Storage requirements, custom backend servers, detailed medication dosing, complex profiles, and more than one initial case.

## First case: The Pain That Moved

### Case frame

- **Patient:** Jordan Lee, age 20
- **Presentation:** abdominal pain and nausea
- **Starting stability:** 82
- **Maximum Care Intervals:** 5
- **True diagnosis:** Acute appendicitis
- **Correct urgency:** Urgent
- **Correct next step:** Urgent surgical assessment and appropriate hospital management

No content includes medication doses or procedural instructions.

### Differential pool

Appendicitis, gastroenteritis, urinary tract infection, kidney stone, and nonspecific abdominal pain. Guided mode may initially surface three while allowing the authored case/debrief to discuss the complete pool.

### Starting clues

- Pain began near the center of the abdomen
- Heart rate 104
- Temperature 38.0°C
- Nausea

### Discoverable clues

- Pain moved toward the lower-right abdomen
- Loss of appetite
- No diarrhea
- Localized lower-right abdominal tenderness
- Mild guarding
- Elevated simulated white blood cell count
- Simulated neutrophil-predominant pattern
- Urinalysis does not strongly support urinary infection
- Urinalysis does not strongly support the authored kidney-stone alternative

All results are fictional/simulated and phrased without absolute diagnostic claims.

### Available actions

| Category | Actions |
|---|---|
| Interview | Ask how pain began; whether it moved; appetite; diarrhea; urinary symptoms |
| Examination | Focused abdominal examination; hydration assessment |
| Monitoring | Repeat vital signs; reassess pain |
| Tests | Blood count; urinalysis; abdominal ultrasound |
| Treatment/safety | Supportive fluids; symptom support; urgent escalation |

Specific costs, delays, yields, and progression values are content-schema inputs to validate on paper before implementation. Defaults must honor two Focus per interval and at most two major pending tests.

## Required playable flow

1. Start solo/practice or join a private room anonymously.
2. Show disclaimer, patient introduction, starting stability, and evidence.
3. Enter planning; select no more than the available 2 Focus.
4. Allow changing selections without resolving them.
5. Deliberately lock actions, then resolve deterministically.
6. Reveal immediate results and advance delayed tests.
7. Update evidence, patient stability, warnings, and progression.
8. Review/rank the differential and classify evidence.
9. Continue to another interval or submit a validated Case Call.
10. Show outcome, score breakdown, explanation, and educational debrief.

## Acceptance criteria

The MVP is complete only when:

- [ ] A player can start the case and see the patient introduction and disclaimer.
- [ ] The player can select up to 2 Focus worth of actions.
- [ ] Initial card selection does not resolve actions; deliberate locking does.
- [ ] Results reveal after resolution, test delays work, and the pending-test limit works.
- [ ] Stability changes according to authored progression and treatment.
- [ ] Evidence appears on the Evidence Board.
- [ ] The player can rank the differential and classify evidence as supporting, conflicting, or unresolved.
- [ ] A complete Case Call can be submitted; incomplete calls receive useful validation.
- [ ] The game calculates a score out of 1,000 and explains the outcome.
- [ ] Desktop and mobile layouts are usable and accessible.
- [ ] Solo play works.
- [ ] Existing private rooms work, or a migration plan is documented after their source is available.
- [ ] Type checking, automated game-engine tests, and production build pass.

## Early playtest metrics

Track manually during early tests unless a suitable existing free analytics system is later found:

- Tutorial and case completion rates
- Average case duration and number of tests ordered
- Correct Case Call percentage
- Percentage who can explain why their answer was correct/incorrect
- Accidental-action frequency
- Mobile abandonment rate
- Player ratings for clarity and enjoyment
- Willingness to replay

Do not add analytics solely for this MVP planning task. Any future telemetry requires a defined privacy approach and should collect the minimum necessary information.

## MVP release gate

Release requires every acceptance item, a medically reviewed and versioned case, documented source metadata, successful accessibility checks, free-tier load assumptions, and playtest evidence that new players understand action locking, evidence relationships, patient stability, and the Case Call.

## Current repository assumption

At documentation time the repository contains no application, package configuration, or Firebase room implementation. References to reuse are therefore conditional: implementation must first confirm whether prior room code is supplied or whether a minimal Spark-compatible room layer needs to be created under a separately approved migration plan.
