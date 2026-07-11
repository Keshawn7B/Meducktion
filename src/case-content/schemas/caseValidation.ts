import type {
  ActionDefinition,
  CaseDefinition,
  MedicalContentStatus,
  RuleCondition,
} from "./caseTypes";
import { CURRENT_CASE_SCHEMA_VERSION } from "./schemaVersion";

export type ValidationSeverity = "error" | "warning";

export interface CaseValidationError {
  code: string;
  path: string;
  message: string;
  severity: ValidationSeverity;
}

export interface CaseValidationResult {
  valid: boolean;
  errors: CaseValidationError[];
}

const statuses = new Set<MedicalContentStatus>([
  "draft",
  "sourceChecked",
  "medicalReviewRequired",
  "medicallyApproved",
  "gameplayTested",
  "releaseApproved",
  "retired",
]);

export function validateCaseDefinition(input: unknown): CaseValidationResult {
  const errors: CaseValidationError[] = [];
  const add = (code: string, path: string, message: string, severity: ValidationSeverity = "error") =>
    errors.push({ code, path, message, severity });

  if (!isRecord(input)) {
    add("CASE_NOT_OBJECT", "$", "Case content must be an object.");
    return { valid: false, errors };
  }

  for (const field of ["schemaVersion", "contentVersion", "caseId", "variantId", "status", "metadata", "patient", "mode", "diagnoses", "clues", "actions", "progression", "caseCall", "finalAnswer", "scoring"] as const) {
    if (!(field in input)) add("REQUIRED_FIELD", `$.${field}`, `Required field '${field}' is missing.`);
  }
  if (input.schemaVersion !== CURRENT_CASE_SCHEMA_VERSION) {
    add("UNSUPPORTED_SCHEMA_VERSION", "$.schemaVersion", `Supported schema version is ${CURRENT_CASE_SCHEMA_VERSION}.`);
  }
  if (typeof input.status !== "string" || !statuses.has(input.status as MedicalContentStatus)) {
    add("UNKNOWN_MEDICAL_STATUS", "$.status", "Medical/release status is not recognized.");
  }
  if (!looksLikeId(input.caseId)) add("INVALID_CASE_ID", "$.caseId", "caseId must be a non-empty stable ID.");
  if (!looksLikeId(input.variantId)) add("INVALID_VARIANT_ID", "$.variantId", "variantId must be a non-empty stable ID.");

  if (!hasCaseShape(input)) return { valid: false, errors };
  const value = input as unknown as CaseDefinition;
  const diagnosisIds = uniqueIds(value.diagnoses, "$.diagnoses", add);
  const clueIds = uniqueIds(value.clues, "$.clues", add);
  const actionIds = uniqueIds(value.actions, "$.actions", add);
  const nextStepIds = uniqueIds(value.nextSteps, "$.nextSteps", add);
  const warningIds = uniqueIds(value.progression.warnings, "$.progression.warnings", add);
  const complicationIds = uniqueIds(value.progression.complications, "$.progression.complications", add);

  checkNumber(value.patient.startingStability, 0, 100, "$.patient.startingStability", "INVALID_STARTING_STABILITY", add);
  checkPositiveInteger(value.mode.maximumCareIntervals, "$.mode.maximumCareIntervals", "INVALID_MAX_INTERVALS", add);
  checkPositiveInteger(value.mode.maximumPendingMajorTests, "$.mode.maximumPendingMajorTests", "INVALID_PENDING_LIMIT", add);
  checkPositiveInteger(value.mode.caseCallAttemptLimit, "$.mode.caseCallAttemptLimit", "INVALID_ATTEMPT_LIMIT", add);

  value.differential.forEach((entry, index) => {
    requireReference(entry.diagnosisId, diagnosisIds, `$.differential[${index}].diagnosisId`, "UNKNOWN_DIAGNOSIS", add);
    entry.supportingClueIds.forEach((id, i) => requireReference(id, clueIds, `$.differential[${index}].supportingClueIds[${i}]`, "UNKNOWN_CLUE", add));
    entry.conflictingClueIds.forEach((id, i) => requireReference(id, clueIds, `$.differential[${index}].conflictingClueIds[${i}]`, "UNKNOWN_CLUE", add));
  });

  value.clues.forEach((clue, ci) => clue.relationships.forEach((relationship, ri) =>
    requireReference(relationship.diagnosisId, diagnosisIds, `$.clues[${ci}].relationships[${ri}].diagnosisId`, "UNKNOWN_DIAGNOSIS", add)));

  value.actions.forEach((action, index) => {
    const base = `$.actions[${index}]`;
    checkNonnegative(action.focusCost, `${base}.focusCost`, "NEGATIVE_FOCUS_COST", add);
    checkNonnegative(action.careBudgetCost, `${base}.careBudgetCost`, "NEGATIVE_BUDGET_COST", add);
    actionResultClueIds(action).forEach((id, i) => requireReference(id, clueIds, `${base}.resultClueIds[${i}]`, "UNKNOWN_CLUE", add));
    if (action.category === "test") {
      if (!Number.isInteger(action.delayCareIntervals) || action.delayCareIntervals < 0) {
        add("INVALID_TEST_DELAY", `${base}.delayCareIntervals`, "Test delay must be a nonnegative integer.");
      }
      action.resultClueIds.forEach((id, i) => requireReference(id, clueIds, `${base}.resultClueIds[${i}]`, "UNKNOWN_CLUE", add));
    }
    if (action.prerequisites) validateCondition(action.prerequisites, `${base}.prerequisites`, actionIds, clueIds, add);
    action.lockoutConditions?.forEach((condition, i) => validateCondition(condition, `${base}.lockoutConditions[${i}]`, actionIds, clueIds, add));
  });

  value.progression.stages.forEach((stage, index) => {
    stage.spontaneousClueIds.forEach((id, i) => requireReference(id, clueIds, `$.progression.stages[${index}].spontaneousClueIds[${i}]`, "UNKNOWN_CLUE", add));
    stage.warningIds.forEach((id, i) => requireReference(id, warningIds, `$.progression.stages[${index}].warningIds[${i}]`, "UNKNOWN_WARNING", add));
    stage.complicationIds.forEach((id, i) => requireReference(id, complicationIds, `$.progression.stages[${index}].complicationIds[${i}]`, "UNKNOWN_COMPLICATION", add));
    stage.conditionalStabilityDeltas.forEach((delta, i) => validateCondition(delta.condition, `$.progression.stages[${index}].conditionalStabilityDeltas[${i}].condition`, actionIds, clueIds, add));
  });
  value.progression.warnings.forEach((warning, index) => validateCondition(warning.condition, `$.progression.warnings[${index}].condition`, actionIds, clueIds, add));
  value.progression.complications.forEach((complication, index) => {
    if (!complication.trigger) add("COMPLICATION_TRIGGER_REQUIRED", `$.progression.complications[${index}].trigger`, "Every complication needs a trigger.");
    else validateCondition(complication.trigger, `$.progression.complications[${index}].trigger`, actionIds, clueIds, add);
    validateCondition(complication.preventedBy, `$.progression.complications[${index}].preventedBy`, actionIds, clueIds, add);
    complication.revealClueIds.forEach((id, i) => requireReference(id, clueIds, `$.progression.complications[${index}].revealClueIds[${i}]`, "UNKNOWN_CLUE", add));
  });
  validateCondition(value.progression.deteriorationStoppingCondition, "$.progression.deteriorationStoppingCondition", actionIds, clueIds, add);
  validateCondition(value.progression.terminalFailureCondition, "$.progression.terminalFailureCondition", actionIds, clueIds, add);

  requireReference(value.finalAnswer.diagnosisId, diagnosisIds, "$.finalAnswer.diagnosisId", "UNKNOWN_FINAL_DIAGNOSIS", add);
  requireReference(value.finalAnswer.nextStepId, nextStepIds, "$.finalAnswer.nextStepId", "UNKNOWN_FINAL_NEXT_STEP", add);
  const finalStep = value.nextSteps.find((step) => step.id === value.finalAnswer.nextStepId);
  if (finalStep && finalStep.urgency !== value.finalAnswer.urgency) add("FINAL_URGENCY_MISMATCH", "$.finalAnswer.urgency", "Final urgency does not match the selected next step.");
  value.finalAnswer.acceptableSupportingClueIds.forEach((id, i) => requireReference(id, clueIds, `$.finalAnswer.acceptableSupportingClueIds[${i}]`, "UNKNOWN_CLUE", add));
  value.finalAnswer.acceptableAlternativeDiagnosisIds.forEach((id, i) => requireReference(id, diagnosisIds, `$.finalAnswer.acceptableAlternativeDiagnosisIds[${i}]`, "UNKNOWN_DIAGNOSIS", add));

  const maxima = Object.values(value.scoring.categories).reduce((sum, category) => sum + category.maximum, 0);
  if (maxima !== 1000) add("SCORE_MAXIMUM_TOTAL", "$.scoring.categories", `Score category maximums total ${maxima}, expected 1000.`);

  const revealable = new Set<string>(value.clues.filter((clue) => clue.initiallyVisible).map((clue) => clue.id));
  value.actions.flatMap(actionResultClueIds).forEach((id) => revealable.add(id));
  value.progression.stages.flatMap((stage) => stage.spontaneousClueIds).forEach((id) => revealable.add(id));
  value.progression.complications.flatMap((complication) => complication.revealClueIds).forEach((id) => revealable.add(id));
  value.clues.filter((clue) => !clue.initiallyVisible && !revealable.has(clue.id)).forEach((clue) =>
    add("CLUE_WITHOUT_REVEAL_PATH", `$.clues[${value.clues.indexOf(clue)}]`, `Clue '${clue.id}' has no reveal path.`));

  if (!value.successfulResolutionPaths.length) add("NO_SUCCESS_PATH", "$.successfulResolutionPaths", "At least one successful resolution path is required.");
  value.successfulResolutionPaths.forEach((path, pi) => path.requiredActionIds.forEach((id, ai) =>
    requireReference(id, actionIds, `$.successfulResolutionPaths[${pi}].requiredActionIds[${ai}]`, "UNKNOWN_ACTION", add)));

  return { valid: errors.every((error) => error.severity !== "error"), errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasCaseShape(value: Record<string, unknown>): boolean {
  return Array.isArray(value.diagnoses) && Array.isArray(value.clues) && Array.isArray(value.actions) &&
    Array.isArray(value.differential) && Array.isArray(value.nextSteps) && isRecord(value.patient) &&
    isRecord(value.mode) && isRecord(value.progression) && Array.isArray(value.progression.stages) &&
    Array.isArray(value.progression.warnings) && Array.isArray(value.progression.complications) &&
    isRecord(value.caseCall) && isRecord(value.finalAnswer) && isRecord(value.scoring) &&
    isRecord(value.scoring.categories) && Array.isArray(value.successfulResolutionPaths);
}

function looksLikeId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueIds(items: Array<{ id: string }>, path: string, add: (code: string, path: string, message: string) => void): Set<string> {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    if (!looksLikeId(item.id)) add("INVALID_ID", `${path}[${index}].id`, "ID must be a non-empty string.");
    else if (ids.has(item.id)) add("DUPLICATE_ID", `${path}[${index}].id`, `Duplicate ID '${item.id}'.`);
    else ids.add(item.id);
  });
  return ids;
}

function requireReference(id: string, ids: Set<string>, path: string, code: string, add: (code: string, path: string, message: string) => void): void {
  if (!ids.has(id)) add(code, path, `Referenced ID '${id}' does not exist.`);
}

function checkNumber(value: number, min: number, max: number, path: string, code: string, add: (code: string, path: string, message: string) => void): void {
  if (!Number.isFinite(value) || value < min || value > max) add(code, path, `Value must be between ${min} and ${max}.`);
}
function checkNonnegative(value: number, path: string, code: string, add: (code: string, path: string, message: string) => void): void {
  if (!Number.isFinite(value) || value < 0) add(code, path, "Value must be nonnegative.");
}
function checkPositiveInteger(value: number, path: string, code: string, add: (code: string, path: string, message: string) => void): void {
  if (!Number.isInteger(value) || value <= 0) add(code, path, "Value must be a positive integer.");
}

function actionResultClueIds(action: ActionDefinition): string[] {
  if (action.category === "test") return action.resultClueIds;
  if (action.category === "escalation") return [];
  if (action.result.type === "revealClues") return action.result.clueIds;
  return action.result.ranges.flatMap((range) => range.clueIds);
}

function validateCondition(
  condition: RuleCondition,
  path: string,
  actionIds: Set<string>,
  clueIds: Set<string>,
  add: (code: string, path: string, message: string) => void,
): void {
  switch (condition.type) {
    case "actionCompleted":
    case "actionNotCompleted":
    case "testPending":
      requireReference(condition.actionId, actionIds, `${path}.actionId`, "UNKNOWN_ACTION", add);
      break;
    case "clueRevealed":
      requireReference(condition.clueId, clueIds, `${path}.clueId`, "UNKNOWN_CLUE", add);
      break;
    case "all":
    case "any":
      condition.conditions.forEach((child, index) => validateCondition(child, `${path}.conditions[${index}]`, actionIds, clueIds, add));
      break;
    case "not":
      validateCondition(condition.condition, `${path}.condition`, actionIds, clueIds, add);
      break;
    default:
      break;
  }
}
