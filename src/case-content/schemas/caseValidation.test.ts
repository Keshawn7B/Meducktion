import { describe, expect, it } from "vitest";

import { thePainThatMoved } from "../cases/thePainThatMoved";
import { validateCaseDefinition } from "./caseValidation";

type JsonRecord = Record<string, unknown>;

function cloneCase(): JsonRecord {
  return JSON.parse(JSON.stringify(thePainThatMoved)) as JsonRecord;
}

function objectAt(parent: JsonRecord, key: string): JsonRecord {
  const value = parent[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${key} is not an object`);
  return value as JsonRecord;
}

function arrayAt(parent: JsonRecord, key: string): unknown[] {
  const value = parent[key];
  if (!Array.isArray(value)) throw new Error(`${key} is not an array`);
  return value;
}

function itemAt(parent: JsonRecord, key: string, index = 0): JsonRecord {
  const value = arrayAt(parent, key)[index];
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${key}[${index}] is not an object`);
  return value as JsonRecord;
}

function expectError(input: unknown, code: string, path?: string): void {
  const result = validateCaseDefinition(input);
  const found = result.errors.find((error) => error.code === code && (path === undefined || error.path === path));
  expect(result.valid).toBe(false);
  expect(found, `${code}${path ? ` at ${path}` : ""}\n${JSON.stringify(result.errors, null, 2)}`).toBeDefined();
}

describe("valid case invariants", () => {
  it("validates the first case before and after JSON serialization", () => {
    expect(validateCaseDefinition(thePainThatMoved)).toEqual({ valid: true, errors: [] });
    expect(validateCaseDefinition(cloneCase())).toEqual({ valid: true, errors: [] });
  });

  it("pins the approved MVP configuration and answer", () => {
    expect(thePainThatMoved.patient.startingStability).toBe(82);
    expect(thePainThatMoved.mode).toMatchObject({
      maximumCareIntervals: 5,
      startingCareBudget: 8,
      focusPerPlayerPerInterval: 2,
      maximumPendingMajorTests: 2,
      caseCallAttemptLimit: 2,
    });
    expect(thePainThatMoved.finalAnswer).toMatchObject({
      diagnosisId: "diagnosis.appendicitis",
      urgency: "urgent",
      nextStepId: "next-step.urgent-surgical-assessment",
    });
    expect(thePainThatMoved.diagnoses.some(({ id }) => id === thePainThatMoved.finalAnswer.diagnosisId)).toBe(true);
    expect(thePainThatMoved.nextSteps.some(({ id }) => id === thePainThatMoved.finalAnswer.nextStepId)).toBe(true);
  });

  it("keeps score maxima at 1,000", () => {
    const total = Object.values(thePainThatMoved.scoring.categories).reduce((sum, category) => sum + category.maximum, 0);
    expect(total).toBe(1000);
  });

  it("has no broken references or unreachable discoverable clues", () => {
    const errors = validateCaseDefinition(thePainThatMoved).errors;
    expect(errors.filter(({ code }) => ["UNKNOWN_CLUE", "UNKNOWN_DIAGNOSIS", "UNKNOWN_ACTION", "CLUE_WITHOUT_REVEAL_PATH"].includes(code))).toEqual([]);
  });
});

describe("structured validation failures", () => {
  it("rejects an unsupported schema version", () => {
    const value = cloneCase(); value.schemaVersion = 999;
    expectError(value, "UNSUPPORTED_SCHEMA_VERSION", "$.schemaVersion");
  });

  it("detects duplicate IDs", () => {
    const value = cloneCase(); itemAt(value, "clues", 1).id = itemAt(value, "clues", 0).id;
    expectError(value, "DUPLICATE_ID", "$.clues[1].id");
  });

  it("detects a missing clue reference", () => {
    const value = cloneCase(); arrayAt(objectAt(itemAt(value, "actions"), "result"), "clueIds").push("clue.missing");
    expectError(value, "UNKNOWN_CLUE");
  });

  it("detects a missing diagnosis reference", () => {
    const value = cloneCase(); itemAt(itemAt(value, "clues"), "relationships").diagnosisId = "diagnosis.missing";
    expectError(value, "UNKNOWN_DIAGNOSIS");
  });

  it("detects a missing action reference", () => {
    const value = cloneCase(); arrayAt(itemAt(value, "successfulResolutionPaths"), "requiredActionIds").push("action.missing");
    expectError(value, "UNKNOWN_ACTION");
  });

  it("rejects invalid starting stability", () => {
    const value = cloneCase(); objectAt(value, "patient").startingStability = 101;
    expectError(value, "INVALID_STARTING_STABILITY", "$.patient.startingStability");
  });

  it("rejects negative Focus and Care Budget costs", () => {
    const focus = cloneCase(); itemAt(focus, "actions").focusCost = -1;
    expectError(focus, "NEGATIVE_FOCUS_COST", "$.actions[0].focusCost");
    const budget = cloneCase(); itemAt(budget, "actions").careBudgetCost = -1;
    expectError(budget, "NEGATIVE_BUDGET_COST", "$.actions[0].careBudgetCost");
  });

  it("rejects a non-integer test delay", () => {
    const value = cloneCase(); itemAt(value, "actions", 9).delayCareIntervals = 1.5;
    expectError(value, "INVALID_TEST_DELAY", "$.actions[9].delayCareIntervals");
  });

  it("rejects zero pending-test and Case Call limits", () => {
    const pending = cloneCase(); objectAt(pending, "mode").maximumPendingMajorTests = 0;
    expectError(pending, "INVALID_PENDING_LIMIT", "$.mode.maximumPendingMajorTests");
    const attempts = cloneCase(); objectAt(attempts, "mode").caseCallAttemptLimit = 0;
    expectError(attempts, "INVALID_ATTEMPT_LIMIT", "$.mode.caseCallAttemptLimit");
  });

  it("rejects score maxima that do not total 1,000", () => {
    const value = cloneCase(); objectAt(objectAt(objectAt(value, "scoring"), "categories"), "diagnosis").maximum = 300;
    expectError(value, "SCORE_MAXIMUM_TOTAL", "$.scoring.categories");
  });

  it("detects a discoverable clue without a reveal path", () => {
    const value = cloneCase();
    const orphan = { ...itemAt(value, "clues"), id: "clue.orphan", initiallyVisible: false };
    arrayAt(value, "clues").push(orphan);
    expectError(value, "CLUE_WITHOUT_REVEAL_PATH");
  });

  it("requires a complication trigger", () => {
    const value = cloneCase(); delete itemAt(objectAt(value, "progression"), "complications").trigger;
    expectError(value, "COMPLICATION_TRIGGER_REQUIRED", "$.progression.complications[0].trigger");
  });

  it("rejects an unknown review status", () => {
    const value = cloneCase(); value.status = "professionallyPerfect";
    expectError(value, "UNKNOWN_MEDICAL_STATUS", "$.status");
  });

  it("rejects invalid final urgency and next step", () => {
    const urgency = cloneCase(); objectAt(urgency, "finalAnswer").urgency = "immediate-ish";
    expectError(urgency, "INVALID_FINAL_URGENCY", "$.finalAnswer.urgency");
    const nextStep = cloneCase(); objectAt(nextStep, "finalAnswer").nextStepId = "next-step.missing";
    expectError(nextStep, "UNKNOWN_FINAL_NEXT_STEP", "$.finalAnswer.nextStepId");
  });

  it("detects rule conditions with unknown action and clue references", () => {
    const action = cloneCase(); objectAt(objectAt(action, "progression"), "deteriorationStoppingCondition").type = "actionCompleted";
    objectAt(objectAt(action, "progression"), "deteriorationStoppingCondition").actionId = "action.missing";
    expectError(action, "UNKNOWN_ACTION");
    const clue = cloneCase(); objectAt(objectAt(clue, "progression"), "terminalFailureCondition").type = "clueRevealed";
    objectAt(objectAt(clue, "progression"), "terminalFailureCondition").clueId = "clue.missing";
    expectError(clue, "UNKNOWN_CLUE");
  });
});

describe("warning timing content contract", () => {
  it("warns one decision window before Interval-4 delay and Interval-5 complication", () => {
    const stages = thePainThatMoved.progression.stages;
    expect(stages.find(({ interval }) => interval === 3)?.warningIds).toContain("warning.delay-unsafe");
    expect(stages.find(({ interval }) => interval === 4)?.warningIds).toContain("warning.complication-imminent");
    expect(stages.find(({ interval }) => interval === 4)?.conditionalStabilityDeltas).toContainEqual(expect.objectContaining({ delta: -4 }));
    expect(stages.find(({ interval }) => interval === 5)?.conditionalStabilityDeltas).toContainEqual(expect.objectContaining({ delta: -6 }));
    expect(stages.map(({ baselineStabilityDelta }) => baselineStabilityDelta)).toEqual([-2, -4, -6, -8, -10]);
    expect(thePainThatMoved.progression.complications[0]).toMatchObject({ stabilityDelta: -12 });
  });
});
