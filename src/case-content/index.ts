export { thePainThatMoved } from "./cases/thePainThatMoved";
import { thePainThatMoved } from "./cases/thePainThatMoved";

export const caseRegistry = [thePainThatMoved] as const;
export { validateCaseDefinition } from "./schemas/caseValidation";
export type { CaseValidationError, CaseValidationResult, ValidationSeverity } from "./schemas/caseValidation";
export type * from "./schemas/caseTypes";
export { CURRENT_CASE_SCHEMA_VERSION } from "./schemas/schemaVersion";
