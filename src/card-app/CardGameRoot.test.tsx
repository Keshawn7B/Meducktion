// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { CARD_MATCH_STORAGE_KEY } from "../card-match-session";
import { CardGameRoot } from "./CardGameRoot";

afterEach(() => { cleanup(); localStorage.clear(); });

async function openMatch() {
  const user = userEvent.setup();
  render(<CardGameRoot />);
  await user.click(screen.getByRole("button", { name: "Play Local" }));
  await user.click(screen.getByRole("button", { name: "Start Match" }));
  await user.click(screen.getByRole("button", { name: "Deal Cards" }));
  return user;
}

describe("player-facing card table", () => {
  it("opens and exits the online lobby without initializing a match", async () => {
    const user = userEvent.setup();
    render(<CardGameRoot />);
    await user.click(screen.getByRole("button", { name: "Play Online" }));
    expect(screen.getByRole("heading", { name: "Create or join a private room" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1, name: "Meducktion" })).toBeInTheDocument();
  });

  it("mounts the active card controller into the tabletop screen", async () => {
    await openMatch();
    expect(screen.getByLabelText("Meducktion card table")).toBeInTheDocument();
    expect(document.querySelector('img[src$="/assets/patient-jordan-lee.webp"]')).toBeInTheDocument();
    expect(document.querySelector('img[src$="/assets/opponent-dr-beak.webp"]')).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /question:/i })).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Your YES / NO evidence" })).toBeInTheDocument();
    expect(screen.getByLabelText("Three face-down opponent cards").children).toHaveLength(3);
    expect(localStorage.getItem(CARD_MATCH_STORAGE_KEY)).toContain('"phase":"card_selection"');
  });

  it("allows unlocking before the bot locks and otherwise reveals automatically", async () => {
    const user = await openMatch();
    const card = screen.getAllByRole("button", { name: /question:/i })[0]!;
    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Lock Card" }));
    expect(screen.getAllByRole("button", { name: /question:/i })).toHaveLength(3);
    const unlock = screen.queryByRole("button", { name: "Unlock Card" });
    if (unlock !== null) {
      await user.click(unlock);
      expect(screen.getByRole("button", { name: "Lock Card" })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Reveal Cards" })).not.toBeInTheDocument();
  });
});
