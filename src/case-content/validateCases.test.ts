import { describe, expect, it } from "vitest";

import { caseRegistry, CURRENT_CASE_SCHEMA_VERSION, validateCaseDefinition } from "./index";

describe("registered CASE//SIGNAL content", () => {
  it.each(caseRegistry)("validates $caseId at its pinned versions", (caseDefinition) => {
    const result = validateCaseDefinition(caseDefinition);

    expect(
      result.errors,
      `${caseDefinition.caseId} schema=${caseDefinition.schemaVersion} content=${caseDefinition.contentVersion}`,
    ).toEqual([]);
    expect(result.valid).toBe(true);
    expect(caseDefinition.schemaVersion).toBe(CURRENT_CASE_SCHEMA_VERSION);
    expect(caseDefinition.contentVersion).toBe("1.0.0-draft.1");
  });
});
