import { describe, expect, it } from "vitest";
import { cardCaseRegistry } from "../card-content";
import { selectMultiplayerCase } from "./caseSelection";

describe("multiplayer case selection", () => {
  it("selects the same case for every player using the same room seed", () => {
    expect(selectMultiplayerCase("room-ABC234-random").caseId).toBe(
      selectMultiplayerCase("room-ABC234-random").caseId,
    );
  });

  it("never repeats the just-completed case on a rematch", () => {
    for (const previousCase of cardCaseRegistry) {
      const nextCase = selectMultiplayerCase(
        `rematch-${previousCase.caseId}`,
        previousCase.caseId,
      );
      expect(nextCase.caseId).not.toBe(previousCase.caseId);
    }
  });

  it("distributes newly seeded rooms across multiple cases", () => {
    const selectedCaseIds = new Set(
      Array.from({ length: 50 }, (_, index) =>
        selectMultiplayerCase(`new-room-${index}`).caseId),
    );
    expect(selectedCaseIds.size).toBeGreaterThan(10);
  });
});
