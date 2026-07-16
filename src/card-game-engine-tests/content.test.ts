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
      expect(cardCase.cards).toHaveLength(23);
      expect(cardCase.cards.map((card) => card.displayName)).toEqual(expectedQuestions);
      expect(new Set(cardCase.clues.map((clue) => clue.answer))).toEqual(
        new Set(["yes", "no"]),
      );
      expect(cardCase.clues.every((clue) => clue.question.trim().length > 0)).toBe(true);
      expect(
        cardCase.cards.filter(
          (card) => card.result.type === "reveal_clue" && card.visibility === "private",
        ).length,
      ).toBe(23);
      expect(cardCase.cards.every((card) => card.copies === 1)).toBe(true);
      expect(new Set(cardCase.cards.map((card) => card.id)).size).toBe(23);
    }
  });

  it("preserves stable case, patient, diagnosis, and clue IDs", () => {
    expect(thePainThatMovedCardCase.caseId).toBe("case.the-pain-that-moved");
    expect(thePainThatMovedCardCase.patient.id).toBe("patient.jordan-lee");
    expect(thePainThatMovedCardCase.correctConditionId).toBe(
      "diagnosis.appendicitis",
    );
    expect(thePainThatMovedCardCase.contentVersion).toContain("diagnosis-education");
    expect(thePainThatMovedCardCase.status).toBe("medicallyApproved");
  });

  it("provides a brief diagnosis-specific Learn more description for every condition", () => {
    for (const cardCase of cardCaseRegistry) {
      for (const condition of cardCase.conditions) {
        expect(condition.learnMore.length).toBeGreaterThan(20);
        expect(condition.learnMore).not.toContain("One possible answer");
      }
    }
    const appendicitis = thePainThatMovedCardCase.conditions.find(
      (condition) => condition.displayName === "Appendicitis",
    );
    expect(appendicitis?.learnMore).toContain("appendix");
  });

  it("uses varied, meaningful YES answers instead of defaulting every case to fever", () => {
    const startingClues = cardCaseRegistry.map((cardCase) => {
      const startingClueId = cardCase.variants[0]?.startingClueId;
      const clue = cardCase.clues.find((candidate) => candidate.id === startingClueId);
      expect(clue).toMatchObject({ answer: "yes", meaningful: true });
      return clue;
    });
    const feverStarts = startingClues.filter(
      (clue) => clue?.question === "Does the patient have a fever?",
    );
    expect(feverStarts).toHaveLength(1);
    expect(new Set(startingClues.map((clue) => clue?.question)).size).toBeGreaterThan(8);
    expect(thePainThatMovedCardCase.variants[0]?.startingClueId).toContain("belly-pain");
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

  it("does not treat dehydration as a symptom-question card", () => {
    expect(cardCaseRegistry.flatMap((cardCase) => cardCase.cards).some(
      (card) => card.displayName === "Dehydrated?" || card.description.includes("signs of dehydration"),
    )).toBe(false);
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
  });

  it("provides diagnosis-specific educational results with common symptoms", () => {
    for (const cardCase of cardCaseRegistry) {
      const diagnosis = cardCase.conditions.find(
        (condition) => condition.id === cardCase.correctConditionId,
      );
      expect(diagnosis).toBeDefined();
      expect(cardCase.educationalExplanation.toLowerCase()).toContain(
        diagnosis?.displayName.toLowerCase(),
      );
      expect(cardCase.educationalExplanation).toContain("Common symptoms");
      expect(cardCase.educationalExplanation).not.toContain(
        "is the authored answer for this specific fictional patient",
      );
    }

    const explanationFor = (diagnosisName: string) => {
      const cardCase = cardCaseRegistry.find((candidate) =>
        candidate.conditions.some(
          (condition) =>
            condition.id === candidate.correctConditionId
            && condition.displayName === diagnosisName,
        ),
      );
      if (!cardCase) throw new Error(`Missing educational fixture: ${diagnosisName}`);
      return cardCase.educationalExplanation;
    };

    expect(explanationFor("Appendicitis")).toContain("appendix");
    expect(explanationFor("Appendicitis")).toContain("lower right");
    expect(explanationFor("Asthma flare")).toContain("airways");
    expect(explanationFor("Asthma flare")).toContain("wheezing");
    expect(explanationFor("Dehydration")).toContain("does not have enough fluid");
    expect(explanationFor("Dehydration")).toContain("darker urine");
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
