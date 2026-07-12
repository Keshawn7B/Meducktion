// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import {
  CARD_MATCH_STORAGE_KEY,
  LEGACY_SOLO_STORAGE_KEY,
} from "../card-match-session";
import { CardGameRoot } from "./CardGameRoot";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

async function beginMatch() {
  const user = userEvent.setup();
  render(<CardGameRoot />);
  await user.click(screen.getByRole("button", { name: "Play" }));
  await user.click(screen.getByRole("button", { name: "Start Match" }));
  expect(
    screen.getByRole("heading", { name: "Jordan Lee" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Deal Cards" }));
  return user;
}

function handCards(): HTMLElement[] {
  return screen.getAllByRole("button", { name: /card:/i });
}

describe("active local card match", () => {
  it("plays the separate choose, lock, reveal, and next-round lifecycle", async () => {
    const user = await beginMatch();
    const openingHand = handCards();

    expect(openingHand).toHaveLength(3);
    await user.click(openingHand[0]!);
    expect(openingHand[0]).toHaveAttribute("aria-pressed", "true");
    await user.click(openingHand[1]!);
    expect(openingHand[0]).toHaveAttribute("aria-pressed", "false");
    expect(openingHand[1]).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Lock Card" }));
    expect(
      screen.getByRole("button", { name: "Reveal Cards" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Card locked")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reveal Cards" }));
    expect(screen.getByRole("heading", { name: "Card reveal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next Round" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next Round" }));

    expect(screen.getByLabelText("Round 2 of 4")).toBeInTheDocument();
    expect(handCards()).toHaveLength(3);
    expect(window.localStorage.getItem(CARD_MATCH_STORAGE_KEY)).toContain(
      '"currentRound":2',
    );
  });

  it("resumes the exact persisted hand and completes all four rounds", async () => {
    let user = await beginMatch();
    const firstCardName = handCards()[0]?.getAttribute("aria-label");
    cleanup();

    user = userEvent.setup();
    render(<CardGameRoot />);
    await user.click(screen.getByRole("button", { name: "Resume match" }));
    expect(handCards()[0]).toHaveAttribute("aria-label", firstCardName);

    for (let round = 1; round <= 4; round += 1) {
      await user.click(handCards()[0]!);
      await user.click(screen.getByRole("button", { name: "Lock Card" }));
      await user.click(screen.getByRole("button", { name: "Reveal Cards" }));
      await user.click(
        screen.getByRole("button", {
          name: round === 4 ? "Finish Match" : "Next Round",
        }),
      );
    }

    expect(
      screen.getByRole("heading", { name: /wins the room!/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Player rankings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The mystery, explained simply" })).toBeInTheDocument();
  });

  it("explains a legacy clinical save instead of attempting to load it", () => {
    window.localStorage.setItem(
      LEGACY_SOLO_STORAGE_KEY,
      JSON.stringify({ sessionVersion: 1, oldClinicalState: true }),
    );

    render(<CardGameRoot />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Meducktion's rules changed",
    );
    expect(screen.queryByRole("button", { name: "Resume match" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(LEGACY_SOLO_STORAGE_KEY)).not.toBeNull();
  });
});
