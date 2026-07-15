import { describe, expect, it } from "vitest";
import {
  cardCaseRegistry,
  thePainThatMovedCardCase,
  type CardCaseContent,
  type InvestigationCard,
} from "../card-content";
import { createCardMatch, getCompatibleCards } from "../card-game-engine";

describe("competitive card content", () => {
  it("preserves distinct authored Jordan Lee choices and excludes an identical profile", () => {
    expect(cardCaseRegistry).toContain(thePainThatMovedCardCase);
    expect(thePainThatMovedCardCase.patient.displayName).toBe("Jordan Lee");
    expect(
      thePainThatMovedCardCase.conditions.map((condition) => condition.displayName),
    ).toEqual(expect.arrayContaining([
      "Appendicitis",
      "Urinary infection",
      "Kidney stone",
    ]));
    expect(
      thePainThatMovedCardCase.conditions.map((condition) => condition.displayName),
    ).not.toContain("Viral gastroenteritis");
    expect(thePainThatMovedCardCase.conditions).toHaveLength(8);
  });

  it("offers 25 cases built around the same large private YES and NO deck", () => {
    expect(cardCaseRegistry).toHaveLength(25);
    const expectedQuestions = thePainThatMovedCardCase.cards.map((card) => card.displayName);
    for (const cardCase of cardCaseRegistry) {
      expect(cardCase.conditions).toHaveLength(8);
      expect(cardCase.cards).toHaveLength(24);
      expect(cardCase.cards.map((card) => card.displayName)).toEqual(expectedQuestions);
      expect(new Set(cardCase.clues.map((clue) => clue.answer))).toEqual(
        new Set(["yes", "no"]),
      );
      expect(cardCase.clues.every((clue) => clue.question.trim().length > 0)).toBe(true);
      expect(
        cardCase.cards.filter(
          (card) => card.result.type === "reveal_clue" && card.visibility === "private",
        ).length,
      ).toBe(24);
      expect(cardCase.cards.every((card) => card.copies === 1)).toBe(true);
      expect(new Set(cardCase.cards.map((card) => card.id)).size).toBe(24);
    }
  });

  it("preserves stable case, patient, diagnosis, and clue IDs", () => {
    expect(thePainThatMovedCardCase.caseId).toBe("case.the-pain-that-moved");
    expect(thePainThatMovedCardCase.patient.id).toBe("patient.jordan-lee");
    expect(thePainThatMovedCardCase.correctConditionId).toBe(
      "diagnosis.appendicitis",
    );
    expect(thePainThatMovedCardCase.contentVersion).toContain("medically-approved-profiles");
    expect(thePainThatMovedCardCase.status).toBe("medicallyApproved");
  });

  it("uses only Ask, Check, and Test question categories", () => {
    expect(
      new Set(thePainThatMovedCardCase.cards.map((card) => card.category)),
    ).toEqual(new Set(["ask", "check", "test"]));
  });

  it("makes Test cards less frequent than Ask and Check cards", () => {
    const copiesByCategory = (category: "ask" | "check" | "test") =>
      thePainThatMovedCardCase.cards
        .filter((card) => card.category === category)
        .reduce((total, card) => total + card.copies, 0);
    expect(copiesByCategory("test")).toBeLessThan(copiesByCategory("ask"));
    expect(copiesByCategory("test")).toBeLessThan(copiesByCategory("check"));
  });

  it("contains no Special cards or public clue cards", () => {
    expect(cardCaseRegistry.flatMap((cardCase) => cardCase.cards).every(
      (card) => card.category !== "special" && card.visibility === "private" && card.result.type === "reveal_clue",
    )).toBe(true);
  });

  it("gives every condition a distinct answer profile within its case", () => {
    for (const cardCase of cardCaseRegistry) {
      const profiles = cardCase.conditions.map((condition) =>
        cardCase.clues
          .map((clue) => clue.supportsConditionIds.includes(condition.id) ? "1" : "0")
          .join(""),
      );
      expect(new Set(profiles).size).toBe(8);
    }
  });

  it("applies the reviewed terminology and high-priority homeostasis decisions", () => {
    const allConditionNames = new Set(
      cardCaseRegistry.flatMap((cardCase) =>
        cardCase.conditions.map((condition) => condition.displayName),
      ),
    );
    expect(allConditionNames.has("Inner-ear vertigo")).toBe(true);
    expect(allConditionNames.has("Panic attack")).toBe(true);
    expect(allConditionNames.has("Acute sinusitis")).toBe(true);
    expect(allConditionNames.has("Viral gastroenteritis")).toBe(true);
    expect(allConditionNames.has("Inner-ear issue")).toBe(false);
    expect(allConditionNames.has("Panic episode")).toBe(false);

    const answerFor = (conditionName: string, question: string) => {
      const cardCase = cardCaseRegistry.find((candidate) =>
        candidate.conditions.some((condition) => condition.displayName === conditionName),
      );
      const condition = cardCase?.conditions.find(
        (candidate) => candidate.displayName === conditionName,
      );
      const clue = cardCase?.clues.find((candidate) => candidate.question === question);
      if (!condition || !clue) throw new Error(`Missing reviewed profile fixture: ${conditionName}`);
      return clue.supportsConditionIds.includes(condition.id)
        ? clue.answer
        : clue.answer === "yes" ? "no" : "yes";
    };

    expect(answerFor("Low blood sugar", "Is the blood sugar reading in the expected range?")).toBe("no");
    for (const condition of ["Dehydration", "Heat exhaustion", "Kidney stone", "Urinary infection"]) {
      expect(answerFor(condition, "Is the urine sample clear?")).toBe("no");
    }
    for (const condition of ["Allergic reaction", "Asthma flare", "Influenza-like illness", "Pneumonia"]) {
      expect(answerFor(condition, "Is the oxygen reading in the expected range?")).toBe("no");
    }
    expect(answerFor("Contact dermatitis", "Are the patient's eyes itchy?")).toBe("no");
    expect(
      cardCaseRegistry.every((cardCase) =>
        cardCase.educationalExplanation.includes("Another person with the same condition"),
      ),
    ).toBe(true);
  });

  it("excludes cards that are incompatible with the active case", () => {
    const base = thePainThatMovedCardCase.cards[0];
    if (base === undefined) {
      throw new Error("Missing card fixture.");
    }
    const incompatible: InvestigationCard = {
      ...base,
      id: "card.other-case",
      compatibility: { caseIds: ["case.other"] },
    };
    const content: CardCaseContent = {
      ...thePainThatMovedCardCase,
      cards: [...thePainThatMovedCardCase.cards, incompatible],
    };
    expect(
      getCompatibleCards(content, "variant.classic").some(
        (card) => card.id === "card.other-case",
      ),
    ).toBe(false);
  });

  it("rejects a unique card definition with duplicate copies", () => {
    const unique = thePainThatMovedCardCase.cards.find(
      (card) => card.duplicatePolicy === "unique_per_deck",
    );
    expect(unique).toBeDefined();
    const content: CardCaseContent = {
      ...thePainThatMovedCardCase,
      cards: thePainThatMovedCardCase.cards.map((card) =>
        card.id === unique?.id ? { ...card, copies: 2 } : card,
      ),
    };
    expect(() => createCardMatch(content, { seed: "invalid-unique" })).toThrow(
      /exactly one copy/,
    );
  });

  it("never gives a player duplicate question cards", () => {
    const state = createCardMatch(thePainThatMovedCardCase, {
      seed: "duplicates",
    });
    const player = state.players["player.you"];
    expect(player).toBeDefined();
    const cardIds = player?.deck.drawPile.map((instance) => instance.cardId) ?? [];
    expect(new Set(cardIds).size).toBe(cardIds.length);
    const startingClueId = thePainThatMovedCardCase.variants[0]!.startingClueId;
    const startingCard = thePainThatMovedCardCase.cards.find(
      (card) => card.result.type === "reveal_clue" && card.result.clueId === startingClueId,
    );
    expect(cardIds).not.toContain(startingCard?.id);
  });
});
