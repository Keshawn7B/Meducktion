// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { thePainThatMoved as def } from "../case-content";
import {
  applySessionCommand,
  createBrowserStorage,
  createSession,
  saveSession,
} from "../game-session";
import type { GameCommand } from "../game-engine";

beforeEach(() => localStorage.clear());
afterEach(cleanup);
async function intro() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Start new case" }));
  return user;
}
async function planning() {
  const user = await intro();
  await user.click(screen.getByRole("button", { name: "Begin assessment" }));
  return user;
}
function saved(commands: GameCommand[]) {
  let s = createSession(def, "test-save");
  for (const [i, c] of commands.entries()) {
    const r = applySessionCommand(def, s, {
      commandId: `c${i}`,
      expectedRevision: s.gameState.revision,
      commandSequence: s.commandSequence + 1,
      command: c,
    });
    if (r.error) throw new Error(r.error.message);
    s = r.session;
  }
  saveSession(createBrowserStorage(localStorage), s);
  return s;
}

describe("local solo UI", () => {
  it("renders the landing screen and disclaimer", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Meducktion" })).toBeTruthy();
    expect(
      screen.getAllByText(/fictional educational game/i).length,
    ).toBeGreaterThan(0);
  });
  it("hides Resume without a valid save", () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "Resume case" })).toBeNull();
  });
  it("starting a case shows the introduction", async () => {
    await intro();
    expect(
      screen.getByRole("heading", { name: "The Pain That Moved" }),
    ).toBeTruthy();
    expect(screen.getByText("Jordan Lee")).toBeTruthy();
  });
  it("beginning assessment enters planning", async () => {
    await planning();
    expect(screen.getByRole("heading", { name: "Planning" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lock actions" })).toBeTruthy();
  });
  it("selecting an action updates provisional Focus", async () => {
    const user = await planning();
    await user.click(
      screen.getByRole("button", { name: /Ask whether the pain moved/ }),
    );
    expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
  });
  it("selection does not reveal its clue", async () => {
    const user = await planning();
    await user.click(
      screen.getByRole("button", { name: /Ask whether the pain moved/ }),
    );
    expect(
      screen.queryByText("Pain moved toward the lower-right abdomen."),
    ).toBeNull();
  });
  it("locking is deliberate and prevents deselection", async () => {
    const user = await planning();
    const action = screen.getByRole("button", {
      name: /Ask whether the pain moved/,
    });
    await user.click(action);
    await user.click(screen.getByRole("button", { name: "Lock actions" }));
    expect(action).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Resolve interval" }),
    ).toBeTruthy();
  });
  it("resolving displays new evidence and stability results", async () => {
    const user = await planning();
    await user.click(
      screen.getByRole("button", { name: /Ask whether the pain moved/ }),
    );
    await user.click(screen.getByRole("button", { name: "Lock actions" }));
    await user.click(screen.getByRole("button", { name: "Resolve interval" }));
    expect(
      screen.getAllByText("Pain moved toward the lower-right abdomen.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Review complete" }),
    ).toBeTruthy();
  });
  it("shows pending test timing", async () => {
    const user = await planning();
    await user.click(screen.getByRole("button", { name: /Blood count/ }));
    await user.click(screen.getByRole("button", { name: "Lock actions" }));
    await user.click(screen.getByRole("button", { name: "Resolve interval" }));
    expect(screen.getByText(/1 interval\(s\) remaining/)).toBeTruthy();
  });
  it("acknowledging results enters decision", async () => {
    const user = await planning();
    await user.click(screen.getByRole("button", { name: "Lock actions" }));
    await user.click(screen.getByRole("button", { name: "Resolve interval" }));
    await user.click(screen.getByRole("button", { name: "Review complete" }));
    expect(screen.getByRole("heading", { name: "Decision" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Call the case" })).toBeTruthy();
  });
  it("does not show invalid phase controls", async () => {
    await planning();
    expect(
      screen.queryByRole("button", { name: "Resolve interval" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Review complete" }),
    ).toBeNull();
  });
  it("shows incomplete Case Call engine feedback", async () => {
    saved([
      { type: "START_CASE" },
      { type: "LOCK_ACTIONS" },
      { type: "RESOLVE_INTERVAL" },
      { type: "ACKNOWLEDGE_RESULTS" },
    ]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Resume case" }));
    await user.click(screen.getByRole("button", { name: "Call the case" }));
    await user.click(screen.getByLabelText(/ready to submit/i));
    const dialog = screen.getByRole("dialog");
    fireEvent.submit(dialog.querySelector("form")!);
    expect(
      (await screen.findAllByText(/Case Call is incomplete/i)).length,
    ).toBeGreaterThan(0);
  });
  it("refresh and Resume restore engine state", async () => {
    const user = await planning();
    await user.click(
      screen.getByRole("button", { name: /Ask whether the pain moved/ }),
    );
    cleanup();
    render(<App />);
    expect(screen.getByRole("button", { name: "Resume case" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Resume case" }));
    expect(
      screen.getByRole("button", { name: /Ask whether the pain moved/ }),
    ).toHaveClass("selected");
  });
  it("Play again removes the saved session", async () => {
    saved([
      { type: "START_CASE" },
      { type: "SELECT_ACTION", actionId: "action.safety.urgent-escalation" },
      { type: "LOCK_ACTIONS" },
      { type: "RESOLVE_INTERVAL" },
      { type: "ACKNOWLEDGE_RESULTS" },
      { type: "COMPLETE_ESCALATED_UNRESOLVED" },
    ]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Resume case" }));
    await user.click(screen.getByRole("button", { name: "Play again" }));
    expect(localStorage.getItem("meducktion:solo-session")).toBeNull();
    expect(screen.getByRole("button", { name: "Start new case" })).toBeTruthy();
  });
  it("renders a real terminal engine score", async () => {
    const commands: GameCommand[] = [
      { type: "START_CASE" },
      { type: "SELECT_ACTION", actionId: "action.safety.urgent-escalation" },
      { type: "LOCK_ACTIONS" },
      { type: "RESOLVE_INTERVAL" },
      { type: "ACKNOWLEDGE_RESULTS" },
      { type: "COMPLETE_ESCALATED_UNRESOLVED" },
    ];
    const terminal = saved(commands);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Resume case" }));
    expect(
      screen.getByText(String(terminal.gameState.score?.total)),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play again" })).toBeTruthy();
  });
});
