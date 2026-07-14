import { describe, expect, it } from "vitest";
import { abdominalMysteryPack, getIdentitySignature, validateIdentityPack } from ".";

describe("identity pack validation", () => {
  it("provides a complete boolean matrix with unique signatures", () => {
    expect(validateIdentityPack(abdominalMysteryPack)).toEqual([]);
    const signatures = abdominalMysteryPack.identities.map((identity) => getIdentitySignature(abdominalMysteryPack, identity.id));
    expect(new Set(signatures).size).toBe(abdominalMysteryPack.identities.length);
    for (const identity of abdominalMysteryPack.identities) {
      for (const card of abdominalMysteryPack.cards) expect(typeof identity.cardResults[card.id]).toBe("boolean");
    }
  });
});
