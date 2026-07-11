# The Pain That Moved — Paper-Playtest Specification

**Case ID:** `case.pain_moved.v1`  
**Content status:** Draft; source checking and medical review required  
**Purpose:** Deterministic design fixture for the CASE//SIGNAL MVP

> CASE//SIGNAL is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. It must not be used to make decisions about real patients.

## 1. Case summary

Jordan Lee, age 20, presents with abdominal pain and nausea. Starting stability is 82 (Stable), interval is 1, Focus is 2, shared Care Budget is 8, and no tests are pending. The authored true diagnosis is acute appendicitis. Correct urgency is **Urgent**; correct next step is **urgent surgical assessment and appropriate hospital management**. Maximum Care Intervals: five.

Learning objective: combine the evolution/location of pain, focused examination, systemic findings, and alternatives; recognize that escalating risk matters even before every result returns. This simplified fictional case is not professional medical guidance.

## 2. Complete action table

Delay 0 reveals during the order interval. Delay 1 first decrements next interval. Burden is qualitative and does not independently change stability in this case.

| ID | Display name | Category | Focus | Budget | Delay | Burden | Result/clue | Repeat/duplicate | Guided hint | Value |
|---|---|---:|---:|---:|---:|---|---|---|---|---|
| `int.onset` | Ask how the pain began | Interview | 1 | 0 | 0 | None | `clue.pain_central` (already visible; confirms source) | No; completed action disabled | “The sequence of symptoms can matter.” | Low value |
| `int.migration` | Ask whether the pain moved | Interview | 1 | 0 | 0 | None | `clue.pain_migrated_rlq` | No; reject duplicate | “A changing pain location may separate alternatives.” | High value |
| `int.appetite` | Ask about appetite | Interview | 1 | 0 | 0 | None | `clue.anorexia` | No; reject duplicate | “Associated symptoms can reinforce a pattern.” | Reasonable |
| `int.diarrhea` | Ask about diarrhea | Interview | 1 | 0 | 0 | None | `clue.no_diarrhea` | No; reject duplicate | “This may test the stomach-infection alternative.” | High value |
| `int.urinary` | Ask about urinary symptoms | Interview | 1 | 0 | 0 | None | `clue.no_urinary_symptoms` | No; reject duplicate | “Compare urinary and abdominal explanations.” | Reasonable |
| `exam.abdomen` | Focused abdominal examination | Examine | 1 | 0 | 0 | Mild | `clue.rlq_tenderness`, `clue.mild_guarding` | No; reject duplicate | “A focused exam may reveal location and warning signs.” | High value |
| `exam.hydration` | Hydration assessment | Examine | 1 | 0 | 0 | None | `clue.mild_dehydration` | No; reject duplicate | “Useful for support, but may not distinguish the diagnosis.” | Low value |
| `monitor.vitals` | Repeat vital signs | Monitor | 1 | 0 | 0 | None | Current stage-specific `clue.vitals_trend_*` | Yes, once/interval; same-interval duplicate rejected | “Trends show safety, not necessarily the cause.” | Reasonable |
| `monitor.pain` | Reassess pain | Monitor | 1 | 0 | 0 | None | Current stage-specific `clue.pain_trend_*` | Yes, once/interval | “Worsening localization can be a warning.” | Reasonable |
| `test.cbc` | Blood count | Test | 1 | 2 | 1 | Low | `clue.wbc_high`, `clue.neutrophil_pattern` | No; pending/completed duplicate rejected | “Looks for a systemic inflammatory pattern.” | High value |
| `test.ua` | Urinalysis | Test | 1 | 2 | 1 | Low | `clue.ua_no_infection`, `clue.ua_no_stone_support` | No; pending/completed duplicate rejected | “May weaken urinary alternatives.” | Low value |
| `test.ultrasound` | Abdominal ultrasound | Test | 2 | 4 | 2 | Low | `clue.us_consistent_appendicitis` | No; pending/completed duplicate rejected | “Potentially strong, but slow and costly.” | Reasonable |
| `treat.fluids` | Supportive fluids | Treat/stabilize | 1 | 1 | 0 | Low | +4 first use, +2 second, +0 later; `clue.fluids_response` | Yes; diminishing returns | “Can protect stability but does not settle the diagnosis.” | Reasonable |
| `treat.symptom_support` | Symptom support | Treat/stabilize | 1 | 1 | 0 | Low | +2 first, +1 second, +0 later; `clue.symptom_response` | Yes; diminishing returns | “Comfort support buys little time and does not treat the cause.” | Low value |
| `safety.escalate` | Urgent escalation | Treat/safety | 1 | 0 | 0 | None | Stops present/future progression; opens final decision | No; reject duplicate | “Escalate when delay is becoming unsafe.” | High value once pattern/red flag is known |

Selecting an unaffordable action, an invalid duplicate, more than available Focus, or a third pending major test prevents locking and spends nothing.

## 3. Complete clue table

Diagnosis abbreviations: APP appendicitis, GE gastroenteritis, UTI urinary tract infection, KS kidney stone, NSAP nonspecific abdominal pain. “Conflict” means authored evidence weighs against, not excludes.

| ID | Display text | Category | Strength | Reliability | Timing | Red flag | Supports | Conflicts | Guided explanation | Initial |
|---|---|---|---|---|---|---|---|---|---|---|
| `clue.pain_central` | Pain began near the center of the abdomen. | History | Moderate | High | Before arrival | No | APP, GE, NSAP | — | “Several causes remain possible at the start.” | Yes |
| `clue.hr104` | Heart rate is 104. | Vital sign | Weak | High | Arrival | No | APP, GE, UTI | NSAP | “A fast pulse signals illness or distress but is nonspecific.” | Yes |
| `clue.temp38` | Temperature is 38.0°C. | Vital sign | Moderate | High | Arrival | Yes | APP, GE, UTI | KS, NSAP | “Fever supports inflammation or infection.” | Yes |
| `clue.nausea` | Jordan reports nausea. | Symptom | Weak | High | Arrival | No | APP, GE, KS | UTI, NSAP | “Nausea occurs in several candidates.” | Yes |
| `clue.pain_migrated_rlq` | Pain moved toward the lower-right abdomen. | History | Strong | High | Interval 1+ | Yes | APP | GE, UTI, KS, NSAP | “The movement and final location form a meaningful pattern.” | No |
| `clue.anorexia` | Jordan has lost their appetite. | Symptom | Moderate | High | Interval 1+ | No | APP | UTI, KS | “This reinforces, but does not prove, the leading pattern.” | No |
| `clue.no_diarrhea` | Jordan has not had diarrhea. | History | Moderate | High | Interval 1+ | No | APP, UTI, KS | GE | “Absence of diarrhea weakens the authored gastroenteritis alternative.” | No |
| `clue.no_urinary_symptoms` | Jordan reports no burning or increased urinary frequency. | History | Moderate | High | Interval 1+ | No | APP, GE, NSAP | UTI | “This weighs against the urinary-infection alternative.” | No |
| `clue.rlq_tenderness` | Tenderness is localized to the lower-right abdomen. | Examination | Strong | High | Interval 1+ | Yes | APP | GE, UTI, NSAP | “Localized findings focus the differential.” | No |
| `clue.mild_guarding` | Mild guarding is present. | Examination | Strong | Moderate | Interval 1+ | Yes | APP | GE, UTI, NSAP | “Guarding is a safety warning and needs context.” | No |
| `clue.mild_dehydration` | Findings suggest mild dehydration. | Examination | Weak | Moderate | Interval 1+ | No | APP, GE | — | “Useful for supportive care; weak for diagnosis.” | No |
| `clue.wbc_high` | Simulated blood count shows an elevated white-cell count. | Laboratory | Moderate | High | Delayed | No | APP, GE, UTI | KS, NSAP | “Inflammation is present, but the source still matters.” | No |
| `clue.neutrophil_pattern` | Simulated result shows a neutrophil-predominant pattern. | Laboratory | Moderate | High | Delayed | No | APP, UTI | GE, KS, NSAP | “This adds weight when combined with the history and exam.” | No |
| `clue.ua_no_infection` | Urinalysis does not strongly support urinary infection. | Laboratory | Moderate | High | Delayed | No | APP, GE, KS, NSAP | UTI | “The result weakens UTI without claiming absolute exclusion.” | No |
| `clue.ua_no_stone_support` | Urinalysis does not strongly support the authored kidney-stone alternative. | Laboratory | Weak | Moderate | Delayed | No | APP, GE, UTI, NSAP | KS | “This weakens the authored stone pattern, not every real stone.” | No |
| `clue.us_consistent_appendicitis` | Simulated ultrasound findings are consistent with appendicitis. | Imaging | Defining | High | Delayed | Yes | APP | GE, UTI, KS, NSAP | “Strong authored evidence, interpreted with the full case.” | No |
| `clue.vitals_trend_guarded` | Fever and heart rate remain elevated. | Vital sign | Moderate | High | Interval 2–3 | Yes | APP, GE, UTI | NSAP | “Persistent abnormal signs increase concern.” | No |
| `clue.vitals_trend_worse` | Vital signs are worsening as stability falls. | Vital sign | Strong | High | Interval 4–5 | Yes | APP | NSAP | “Delay is becoming unsafe; act on the overall pattern.” | No |
| `clue.pain_trend_localized` | Pain remains focused in the lower-right abdomen. | Symptom | Strong | High | Interval 2–3 | Yes | APP | GE, UTI, NSAP | “Persistent localization strengthens the leading pattern.” | No |
| `clue.pain_trend_worse` | Pain and guarding are worsening. | Symptom | Strong | High | Interval 4–5 | Yes | APP | GE, UTI, NSAP | “This is a late safety warning.” | No |
| `clue.fluids_response` | Stability improves modestly after supportive fluids. | Treatment response | Weak | High | Immediate | No | APP, GE, UTI, KS | — | “Response supports hydration needs, not a single diagnosis.” | No |
| `clue.symptom_response` | Symptoms improve briefly with support. | Treatment response | Weak | Moderate | Immediate | No | APP, GE, UTI, KS, NSAP | — | “Comfort improvement does not resolve the cause.” | No |
| `clue.complication` | Worsening localized inflammation causes acute deterioration. | Complication | Strong | High | Interval 5 | Yes | APP | GE, UTI, KS, NSAP | “The warned delay-related complication has occurred.” | No |

## 4. Differential table

| Diagnosis | Initially plausible because | Supporting evidence | Weakening evidence | Danger / Must Exclude | Guided explanation |
|---|---|---|---|---|---|
| Acute appendicitis | Central pain, nausea, fever | Migration, RLQ tenderness, guarding, inflammatory blood pattern, ultrasound | No authored strong conflict | High, time-sensitive / Yes | “A leading pattern can emerge from how pain changes plus focused findings.” |
| Gastroenteritis | Central pain, nausea, fever | Diarrhea would support; dehydration is compatible | No diarrhea, focal RLQ findings/guarding, ultrasound | Moderate / No | “Usually remains plausible early but becomes weaker as findings localize.” |
| Urinary tract infection | Fever and fast pulse | Urinary symptoms/infective urinalysis would support | No urinary symptoms, non-supportive urinalysis, focal abdominal exam | Moderate / No | “Ask whether the urinary pattern is actually present.” |
| Kidney stone | Abdominal pain and nausea | Colicky/flank pattern or authored urine support would help | Fever pattern, migrated RLQ pain, guarding, non-supportive urinalysis | High / Yes until key history/exam | “Potentially urgent, but the authored pattern points elsewhere.” |
| Nonspecific abdominal pain | Early evidence is incomplete | Only nonspecific starting symptoms | Fever, tachycardia, migration, guarding, labs/imaging | Low label but unsafe if used to dismiss red flags / No | “A fallback label becomes inappropriate when specific warnings accumulate.” |

## 5. Interval-by-interval state

Treatments apply before the listed losses. Stability is clamped 0–82. Escalation prevents the current interval's listed natural, delay, and complication losses and all later losses; it then opens a final Case Call opportunity. Choosing not to call ends as Safe stabilization without final diagnosis.

| Interval | Stage | Baseline loss | Extra loss | Spontaneous finding/warning | Complication | Fluids / symptom support | Escalation |
|---:|---|---:|---:|---|---|---|---|
| 1 | Early local inflammation | −2 | 0 | Starting findings only | None | +4/+2 first use; cap 82 | Stops loss and opens final decision |
| 2 | Localizing | −4 | 0 | Guided reminder to reassess changing pain | None | Same diminishing rules | Stops loss and opens final decision |
| 3 | Guarded progression | −6 | 0 | Persistent abnormal trend if monitored; warning when stability ≤75 | None | Same | Stops loss and opens final decision |
| 4 | Worsening with delay | −8 | −4 if not escalated | Explicit “delay is becoming unsafe” warning before loss | Armed for next interval | Same | Stops both losses and opens final decision |
| 5 | Late/complicated | −10 | −6 if not escalated | Explicit complication warning | −12 if not escalated | Same | Stops all three losses and opens final decision |

At stability 25 or below, state is Critical; at 0, immediate Critical failure. Escalation is the only MVP action that stops deterioration. Fluids and symptom support offset stability loss but never stop progression and have diminishing returns.

## 6. Test timing examples

- Blood count ordered in Interval 1 at delay 1 is enqueued with 1 after step 4. It decrements to 0 and reveals at step 5 of **Interval 2**.
- Ultrasound ordered in Interval 1 at delay 2 decrements in Intervals 2 and 3 and reveals in **Interval 3**.
- Ultrasound ordered in Interval 4 would be due in Interval 6, beyond this case. It is cancelled when Interval 5 ends and reveals nothing.
- Two pre-existing tests may decrement to zero and reveal simultaneously in stable test-ID order.
- A Case Call or terminal state cancels every pending result; pending tests never complete in the debrief.

## 7. Case Call validation

A complete call contains diagnosis, urgency, next step, two revealed supporting clues from at least two categories, a named alternative, and a revealed clue/rationale explaining why that alternative is less likely. The supporting clues must actually support the selected diagnosis in authored data; one clue cannot fill both slots. Structural failures do not consume an attempt.

- **Excellent:** “Acute appendicitis; Urgent; urgent surgical assessment and appropriate hospital management. Supported by migrated RLQ pain (`clue.pain_migrated_rlq`, History) and localized RLQ tenderness (`clue.rlq_tenderness`, Examination). Gastroenteritis is less likely because there is no diarrhea (`clue.no_diarrhea`).” Valid and strong.
- **Correct but poorly reasoned:** Appendicitis/Urgent/correct next step, citing nausea and heart rate from two categories, with UTI weakened by no urinary symptoms. Structurally valid but earns limited reasoning credit.
- **Incomplete:** Appendicitis/Urgent/correct next step with only migrated pain. Rejected; no attempt or time cost.
- **Incorrect:** Gastroenteritis/Urgent/supportive management, citing nausea and fever, with UTI weakened by absent urinary symptoms. Structurally valid but wrong; first-attempt consequence applies.
- **Unsafe:** Nonspecific abdominal pain/Non-urgent/“wait without escalation” after guarding or a worsening red flag is revealed. Authored critically unsafe combination; case ends.

## 8. Exact scoring formulas

All values are integers. Add six category scores, then clamp total to 0–1,000; no other penalty is applied.

| Category | Formula |
|---|---|
| Diagnosis, 0–350 | Correct first accepted call 350; correct after one incorrect call 250; Safe stabilization without diagnosis 175; incorrect/unsafe/failure 0 |
| Safety, 0–200 | Final stability ≥76: 200; 61–75: 170; 41–60: 120; 26–40: 70; 1–25: 25; 0: 0 |
| Reasoning, 0–150 | Valid supporting clue 40 each (max 80); two or more evidence categories 20; valid alternative 10; revealed evidence correctly weakens it 20; all submitted evidence relationships correctly classified 20. Safe no-diagnosis outcome: 0. |
| Urgency/next step, 0–150 | Correct urgency 75; correct next step 75. A safe escalation-without-call earns both because the action commits to the authored urgent disposition. Otherwise each is independently 0/75. |
| Efficiency, 0–100 | `clamp(60 + 5 × unused budget − 10 × low-value completed actions − 20 × wasteful completed actions, 0, 100)`. High-value/reasonable actions have no deduction. Repeated zero-benefit treatment is wasteful. Rejected actions do not count. |
| Speed/coordination, 0–50 | Terminal decision in Interval 1/2/3/4/5 earns 50/40/30/20/10. A forced delay from an incorrect call advances the terminal interval. Cooperative mode also requires all players locked; no separate bonus. |

### Scored walkthrough summaries

1. **Efficient excellent:** Diagnosis 350 + Safety 200 (78) + Reasoning 150 + Urgency 150 + Efficiency 85 (5 budget left) + Speed 30 (I3) = **965**.
2. **Correct, test-heavy:** 350 + 120 (58) + 150 + 150 + 30 (0 budget, two low-value actions) + 10 (I5) = **810**.
3. **Correct after major deterioration:** 350 + 120 (48) + 150 + 150 + 70 (2 budget left) + 10 (I5) = **850**.
4. **Failed resolution:** 0 + 0 (stability 0) + 0 + 0 + 20 (waste/low-value actions) + 10 = **30**.

Category boundaries remove fractional rounding. Score floor is 0 and ceiling 1,000.

## 9. Paper-playtest scripts

### Path A: Efficient intended path

| Interval | Actions (Focus) | Budget spent | Reveals/pending | Stability |
|---:|---|---:|---|---:|
| 1 | Ask whether pain moved (1); focused abdominal exam (1) | 0 | Migration, RLQ tenderness, guarding | 82−2 = 80 |
| 2 | Blood count (1); supportive fluids (1) | 3 | CBC pending 1; fluids response | min(82,80+4)−4 = 78 |
| 3 | Ask about diarrhea (1); urgent escalation (1) | 0 | CBC returns; no diarrhea; progression stopped | 78 |

Final call uses migration + tenderness, weakens gastroenteritis with no diarrhea. Pending none. Outcome Excellent resolution. Score is **965**.

### Path B: Test-spam path

| Interval | Actions (Focus) | Budget spent | Reveals/pending | Stability |
|---:|---|---:|---|---:|
| 1 | Blood count (1); urinalysis (1) | 4 | Both pending 1 | 80 |
| 2 | Ultrasound (2) | 4 | CBC/UA return; ultrasound pending 2 | 76 |
| 3 | Hydration assessment (1); repeat vitals (1) | 0 | Ultrasound pending 1; weak/monitoring clues | 70 |
| 4 | Symptom support (1); reassess pain (1) | 0 (unaffordable symptom support is rejected; only reassess locks) | Ultrasound returns; worsening pain | 70−8−4 = 58 |
| 5 | Urgent escalation (1); unused Focus | 0 | Progression stops | 58 |

The budget blocks supportive treatment after all three tests. The player calls correctly with strong lab/imaging evidence. Outcome Correct but inefficient, final score **810**: 350 + 120 + 150 + 150 + 30 (zero budget; hydration and UA are low value) + 10.

### Path C: Premature guess path

| Interval | Actions/call | Focus | Budget | Reveals/pending | Stability |
|---:|---|---:|---:|---|---:|
| 1 | Complete but incorrect gastroenteritis call using nausea + fever | 0 | 0 | First wrong call; next interval forced delay | 80 after I1 progression |
| 2 | No actions (penalty interval) | 0 | 0 | Guarded warning | 76 |
| 3 | Ask whether pain moved; focused abdominal exam | 2 | 0 | Migration, tenderness, guarding | 70 |
| 4 | Supportive fluids; urgent escalation | 2 | 1 | Fluids response; progression stops | 74 |

Corrected call at the Interval 4 decision. Outcome Correct after premature call. Score **835**: Diagnosis 250 + Safety 170 + Reasoning 150 + Urgency 150 + Efficiency 95 (`60 + 5×7` unused budget) + Speed 20.

### Path D: Safety-first but unresolved

| Interval | Actions | Focus | Budget spent | Reveals/pending | Stability |
|---:|---|---:|---:|---|---:|
| 1 | Supportive fluids; repeat vital signs | 2 | 1 | Fluids response, current vitals | min(82,82+4)−2 = 80 |
| 2 | Urgent escalation; symptom support | 2 | 1 | Symptom response; progression stopped | 82 (capped) |

Player chooses safe completion without a diagnosis. Outcome Safe stabilization without final diagnosis. Score: 175 + 200 + 0 + 150 + 90 (6 budget left) + 40 = **655**.

## 10. Balance findings and adjustments

- **Optimal path:** Migration plus examination is intentionally strong but not sufficient by itself for maximum reasoning across all play styles; alternatives and safety still matter. Guided hints describe value without naming the answer.
- **Ultrasound:** Not necessary. It offers defining evidence at high cost and delay; a history/exam/lab path can score higher.
- **Fluids:** Helpful but capped at starting stability and diminishing (4/2/0); it cannot stop progression, so it is not overpowered.
- **Budget:** Eight meaningfully blocks buying all three tests plus treatments. The test-spam simulation exposed and now explicitly documents rejection of an unaffordable treatment.
- **Early solving:** A knowledgeable player can suspect appendicitis immediately, but a valid high-reasoning call requires discovered evidence and alternative analysis. This is desirable rather than artificially hiding the pattern.
- **Incorrect-call penalty:** A 100-point diagnosis loss plus one forced interval is material but recoverable. Incomplete UI submissions are not punished.
- **Five intervals:** Sufficient for a delayed ultrasound ordered by Interval 3 to return only if timing permits; late ordering carries a visible risk. The late complication makes waiting costly without random failure.
- **Beginner clarity:** Plain language, expandable definitions, visible value/cost/delay, and relationship explanations keep the case understandable. The five candidates remain visible so the debrief is not surprising.

Implementation tests must calculate from state rather than copy prose totals. Before build, a human tabletop session should validate whether revealing both exam clues for 1 Focus is too efficient.

## 11. Future implementation requirements

### Engine behaviors

Phase validation; per-player Focus reset/expiry; atomic locks; ordered deterministic resolution; budget/queue/duplicate validation; delayed tests; treatment diminishing returns; progression/warnings/complication; escalation; stability clamp/state; Case Call attempts and forced delay; terminal cancellation; exact scoring; idempotent replay.

### UI states

Patient/phase/stability strip; four mobile tabs; local planned versus locked actions; Focus/Budget preview; pending-test timers; evidence relationships; shared differential edit conflict; warnings; complete Case Call form; validation errors; results/debrief; resumed-solo and expired-room states; non-drag ranking controls.

### Validation rules

Stable IDs and content version; valid action availability/cost; maximum two pending tests; no invalid duplicates; exact clue-category requirements; alternative/rationale relationship; safe urgency/next-step combinations; medical content status gates.

### Automated tests

Every phase edge; delay 0/1/2; simultaneous returns; late cancellation; queue/budget/Focus boundaries; treatment 4/2/0 and 2/1/0; all five progression rows; warning and complication gates; escalation at each interval; stability 82/76/75/26/25/1/0; incomplete/incorrect/unsafe calls; two-attempt limit; all scoring bands; four scripted paths; localStorage migration/corruption; Firestore version conflicts/reconnect/host migration/expiry.

### Eventually synchronized in Firestore

Room/case version, phase, interval, stability, budget, revealed clue IDs, pending tests, treatment-use counts, escalation/terminal state, shared committed differential, accepted Case Call/attempt count, score/outcome, player presence/readiness and locked actions, room version, host lease, and expiry.

### Remains local

Uncommitted action selection, hover/expanded panels, uncommitted differential draft, tab/scroll state, accessibility preferences, tutorial display state, and solo run/save. Bundled case definitions remain repository content rather than room copies.
