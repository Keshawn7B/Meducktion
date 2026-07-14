import type { IdentityCasePack, IdentityPackValidationIssue } from "./types";

export function getIdentitySignature(
  pack: IdentityCasePack,
  identityId: string,
): string {
  const identity = pack.identities.find((candidate) => candidate.id === identityId);
  if (!identity) return "";
  return pack.cards.map((card) => (identity.cardResults[card.id] ? "1" : "0")).join("");
}

export function validateIdentityPack(pack: IdentityCasePack): IdentityPackValidationIssue[] {
  const issues: IdentityPackValidationIssue[] = [];
  const signatures = new Map<string, string>();
  for (const identity of pack.identities) {
    for (const card of pack.cards) {
      if (typeof identity.cardResults[card.id] !== "boolean") {
        issues.push({ code: "MISSING_RESULT", message: `${identity.id} lacks ${card.id}.` });
      }
    }
    const signature = getIdentitySignature(pack, identity.id);
    const duplicate = signatures.get(signature);
    if (duplicate) issues.push({ code: "DUPLICATE_SIGNATURE", message: `${identity.id} matches ${duplicate}.` });
    signatures.set(signature, identity.id);
    const yesCount = Object.values(identity.cardResults).filter(Boolean).length;
    if (yesCount < 4) issues.push({ code: "TOO_FEW_YES", message: `${identity.id} has too few YES traits.` });
    if (pack.cards.length - yesCount < 4) issues.push({ code: "TOO_FEW_NO", message: `${identity.id} has too few NO traits.` });
  }
  for (const card of pack.cards) {
    const matches = pack.identities.filter((identity) => identity.cardResults[card.id]).length;
    if (matches === 0 || matches === pack.identities.length) {
      issues.push({ code: "UNIVERSAL_CARD", message: `${card.id} does not divide the identity pool.` });
    }
    if (matches < 2 || pack.identities.length - matches < 2) {
      issues.push({ code: "SINGLE_RESULT_GIVEAWAY", message: `${card.id} uniquely identifies or excludes one identity.` });
    }
  }
  for (let first = 0; first < pack.identities.length; first += 1) {
    for (let second = first + 1; second < pack.identities.length; second += 1) {
      const left = pack.identities[first]!;
      const right = pack.identities[second]!;
      const differences = pack.cards.filter((card) => left.cardResults[card.id] !== right.cardResults[card.id]).length;
      if (differences < 2) issues.push({ code: "WEAK_PAIR_SEPARATION", message: `${left.id} and ${right.id} differ on fewer than two cards.` });
    }
  }
  return issues;
}
