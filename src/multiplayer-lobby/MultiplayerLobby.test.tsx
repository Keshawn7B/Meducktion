// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MULTIPLAYER_NAME_STORAGE_KEY, MultiplayerLobby } from "./MultiplayerLobby";
import type { MultiplayerLobbyActions, MultiplayerLobbyModel } from "./types";

afterEach(() => { cleanup(); localStorage.clear(); });

function actions(): MultiplayerLobbyActions {
  return {
    createRoom: vi.fn(async () => undefined),
    joinRoom: vi.fn(async () => undefined),
    toggleReady: vi.fn(async () => undefined),
    startLobby: vi.fn(async () => undefined),
    leaveRoom: vi.fn(async () => true),
    clearError: vi.fn(),
  };
}

function entryModel(): MultiplayerLobbyModel {
  return {
    screen: "entry",
    busy: false,
    operation: null,
    maximumPlayers: 4,
    isHost: false,
    currentPlayerReady: false,
    canStart: false,
    members: [],
  };
}

describe("multiplayer lobby UI", () => {
  it("creates and joins rooms through explicit lobby actions", async () => {
    const user = userEvent.setup();
    const calls = actions();
    render(<MultiplayerLobby model={entryModel()} actions={calls} onExit={vi.fn()} />);

    const name = screen.getByLabelText("Your display name");
    await user.clear(name);
    await user.type(name, "Keshawn");
    await user.selectOptions(screen.getByLabelText("Seats"), "3");
    await user.click(screen.getByRole("button", { name: "Create Room" }));
    expect(calls.createRoom).toHaveBeenCalledWith("Keshawn", 3);
    expect(localStorage.getItem(MULTIPLAYER_NAME_STORAGE_KEY)).toBe("Keshawn");

    await user.type(screen.getByLabelText("Room code"), "abc234");
    await user.click(screen.getByRole("button", { name: "Join Room" }));
    expect(calls.joinRoom).toHaveBeenCalledWith("Keshawn", "ABC234");
  });

  it("sanitizes ambiguous room-code characters before joining", async () => {
    const user = userEvent.setup();
    render(<MultiplayerLobby model={entryModel()} actions={actions()} onExit={vi.fn()} />);
    const code = screen.getByLabelText("Room code");
    const join = screen.getByRole("button", { name: "Join Room" });
    await user.type(code, "a0b1io");
    expect(code).toHaveValue("AB");
    expect(join).toBeDisabled();
    await user.type(code, "c234");
    expect(code).toHaveValue("ABC234");
    expect(join).toBeEnabled();
  });

  it("shows seats, readiness, and the host start hierarchy", async () => {
    const user = userEvent.setup();
    const calls = actions();
    const model: MultiplayerLobbyModel = {
      screen: "room",
      busy: false,
      operation: null,
      roomCode: "ABC234",
      maximumPlayers: 3,
      isHost: true,
      currentPlayerReady: true,
      canStart: true,
      members: [
        { uid: "host", displayName: "Keshawn", isHost: true, isCurrentPlayer: true, ready: true },
        { uid: "guest", displayName: "Mira", isHost: false, isCurrentPlayer: false, ready: true },
      ],
    };
    render(<MultiplayerLobby model={model} actions={calls} onExit={vi.fn()} />);

    expect(screen.getByLabelText("Room players").children).toHaveLength(3);
    expect(screen.getByText("Keshawn (You)")).toBeInTheDocument();
    expect(screen.getByText("Unclaimed chair")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start Match" }));
    expect(calls.startLobby).toHaveBeenCalledOnce();
  });

  it("explains the secure handoff when the lobby is ready", () => {
    render(
      <MultiplayerLobby
        model={{ ...entryModel(), screen: "ready", roomCode: "ABC234" }}
        actions={actions()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Every chair is warm and every opinion is ready" })).toBeInTheDocument();
    expect(screen.getByText(/next bit of medical mischief/)).toBeInTheDocument();
  });

  it("stays in the lobby when leaving fails", async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    const calls: MultiplayerLobbyActions = {
      ...actions(),
      leaveRoom: vi.fn(async () => false),
    };
    render(
      <MultiplayerLobby
        model={{
          ...entryModel(),
          screen: "room",
          roomCode: "ABC234",
          isHost: true,
          currentPlayerReady: true,
          members: [{ uid: "host", displayName: "Host", isHost: true, isCurrentPlayer: true, ready: true }],
        }}
        actions={calls}
        onExit={onExit}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(calls.leaveRoom).toHaveBeenCalledOnce();
    expect(onExit).not.toHaveBeenCalled();
  });
});
