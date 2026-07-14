import { describe, expect, it } from "vitest";
import {
  cardCaseRegistry,
  thePainThatMovedCardCase,
  type CardCaseContent,
  type InvestigationCard,
} from "../card-content";
import { createCardMatch, getCompatibleCards } from "../card-game-engine";

describe("competitive card content", () => {
  it("registers the converted Jordan Lee case with four beginner choices", () => {
    expect(cardCaseRegistry).toContain(thePainThatMovedCardCase);
    expect(thePainThatMovedCardCase.patient.displayName).toBe("Jordan Lee");
    expect(
      thePainThatMovedCardCase.conditions.map((condition) => condition.displayName),
    ).toEqual([
      "Appendicitis",
      "Stomach infection",
      "Urinary infection",
      "Kidney stone",
    ]);
  });

  it("preserves stable case, patient, diagnosis, and clue IDs", () => {
    expect(thePainThatMovedCardCase.caseId).toBe("case.the-pain-that-moved");
    expect(thePainThatMovedCardCase.patient.id).toBe("patient.jordan-lee");
    expect(thePainThatMovedCardCase.correctConditionId).toBe(
      "diagnosis.appendicitis",
    );
    expect(
      thePainThatMovedCardCase.clues.map((clue) => clue.id),
    ).toContain("clue.pain-migrated-lower-right");
  });

  it("uses exactly Ask, Check, Test, and Special categories", () => {
    expect(
      new Set(thePainThatMovedCardCase.cards.map((card) => card.category)),
    ).toEqual(new Set(["ask", "check", "test", "special"]));
  });

  it("makes Test cards less frequent than Ask and Check cards", () => {
    const copiesByCategory = (category: "ask" | "check" | "test") =>
      thePainThatMovedCardCase.cards
        .filter((card) => card.category === category)
        .reduce((total, card) => total + card.copies, 0);
    expect(copiesByCategory("test")).toBeLessThan(copiesByCategory("ask"));
    expect(copiesByCategory("test")).toBeLessThan(copiesByCategory("check"));
  });

  it("contains no more than five authored Special cards", () => {
    expect(
      thePainThatMovedCardCase.cards.filter((card) => card.category === "special"),
    ).toHaveLength(5);
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

  it("keeps allowed duplicate cards as distinct deck instances", () => {
    const state = createCardMatch(thePainThatMovedCardCase, {
      seed: "duplicates",
    });
    const player = state.players["player.you"];
    expect(player).toBeDefined();
    const movementCards = player?.deck.drawPile.filter(
      (instance) => instance.cardId === "card.ask.pain-movement",
    );
    expect(movementCards).toHaveLength(2);
    expect(new Set(movementCards?.map((card) => card.instanceId)).size).toBe(2);
  });
});
