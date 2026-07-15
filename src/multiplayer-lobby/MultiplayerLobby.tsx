import { useId, useState, type FormEvent } from "react";
import type { MultiplayerLobbyProps } from "./types";
import "./multiplayer-lobby.css";

export const MULTIPLAYER_NAME_STORAGE_KEY = "meducktion:multiplayer-name";

const duckLogoAsset = `${import.meta.env.BASE_URL}assets/meducktion-medical-duck-logo.webp`;

function savedDisplayName(): string {
  try {
    return localStorage.getItem(MULTIPLAYER_NAME_STORAGE_KEY) || "Detective";
  } catch {
    return "Detective";
  }
}

export function MultiplayerLobby({ model, actions, onExit }: MultiplayerLobbyProps) {
  const [displayName, setDisplayName] = useState(savedDisplayName);
  const [roomCode, setRoomCode] = useState("");
  const [maximumPlayers, setMaximumPlayers] = useState<2 | 3 | 4>(4);
  const [copied, setCopied] = useState(false);
  const nameId = useId();
  const codeId = useId();
  const validName = displayName.trim().length > 0;
  const validRoomCode = /^[A-HJ-NP-Z2-9]{6}$/.test(roomCode);

  function rememberName() {
    try { localStorage.setItem(MULTIPLAYER_NAME_STORAGE_KEY, displayName.trim()); } catch { /* Storage is optional. */ }
  }

  function create(event: FormEvent) {
    event.preventDefault();
    if (validName) {
      rememberName();
      void actions.createRoom(displayName.trim(), maximumPlayers);
    }
  }

  function join(event: FormEvent) {
    event.preventDefault();
    if (validName && validRoomCode) {
      rememberName();
      void actions.joinRoom(displayName.trim(), roomCode);
    }
  }

  async function copyCode() {
    if (!model.roomCode) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(model.roomCode);
      } else {
        const input = document.createElement("textarea");
        input.value = model.roomCode;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  async function exitLobby() {
    if (model.screen === "room" && !(await actions.leaveRoom())) return;
    onExit();
  }

  return (
    <div className="meducktion-app lobby-app">
      <main className="lobby-shell" aria-labelledby="lobby-title">
        <header className="lobby-header">
          <button className="button button-text" onClick={() => void exitLobby()}>Back</button>
          <div className="lobby-wordmark" aria-label="Meducktion online lobby">
            <img src={duckLogoAsset} alt="" />
            <strong>Meducktion</strong>
          </div>
          <span className="lobby-live-badge">Online lobby</span>
        </header>

        {model.errorMessage && (
          <div className="lobby-error" role="alert">
            <p>{model.errorMessage}</p>
            <button className="button button-small" onClick={actions.clearError}>Dismiss</button>
          </div>
        )}

        {model.screen === "entry" && (
          <section className="lobby-entry">
            <div className="lobby-intro">
              <p className="playful-kicker">Online multiplayer</p>
              <h1 id="lobby-title">Create or join a private room</h1>
              <p>Create a room or enter a six-character code from a friend. No account is required.</p>
              <label htmlFor={nameId}>Your display name</label>
              <input id={nameId} value={displayName} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} />
            </div>
            <div className="lobby-entry-cards">
              <form className="lobby-choice-card create-room-card" onSubmit={create}>
                <span className="lobby-choice-icon" aria-hidden="true">+</span>
                <h2>Create a room</h2>
                <p>Start a new room and share its code.</p>
                <label htmlFor="lobby-capacity">Seats</label>
                <select id="lobby-capacity" value={maximumPlayers} onChange={(event) => setMaximumPlayers(Number(event.target.value) as 2 | 3 | 4)}>
                  <option value={2}>2 players</option>
                  <option value={3}>3 players</option>
                  <option value={4}>4 players</option>
                </select>
                <button className="button button-primary button-large" disabled={!validName || model.busy} type="submit">
                  {model.operation === "create" ? "Creating Room..." : "Create Room"}
                </button>
              </form>
              <form className="lobby-choice-card join-room-card" onSubmit={join}>
                <span className="lobby-choice-icon" aria-hidden="true">#</span>
                <h2>Join a room</h2>
                <p>Enter the code shown on the host's screen.</p>
                <label htmlFor={codeId}>Room code</label>
                <input id={codeId} className="room-code-input" value={roomCode} maxLength={6} autoCapitalize="characters" autoComplete="off" inputMode="text" onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6))} placeholder="ABC234" aria-describedby={`${codeId}-hint`} />
                <small id={`${codeId}-hint`} className="room-code-hint">Six letters or numbers. Codes never use 0, 1, I, or O.</small>
                <button className="button button-cream button-large" disabled={!validName || !validRoomCode || model.busy} type="submit">
                  {model.operation === "join" ? "Joining Room..." : "Join Room"}
                </button>
              </form>
            </div>
          </section>
        )}

        {model.screen === "room" && (
          <section className="lobby-room">
            <div className="room-code-panel">
              <span className="lobby-connected" role="status"><i aria-hidden="true" /> Connected</span>
              <p>Invite code</p>
              <strong aria-label={`Room code ${model.roomCode}`}>{model.roomCode}</strong>
              <button className="button button-small" onClick={() => void copyCode()} aria-live="polite">{copied ? "Copied!" : "Copy Code"}</button>
            </div>
            <div className="lobby-table-card">
              <div>
                <p className="playful-kicker">{model.caseTitle ?? "Medical mystery"}</p>
                <h1 id="lobby-title">Players in this room</h1>
                <p>{model.members.length} of {model.maximumPlayers} seats filled</p>
              </div>
              <ol className="lobby-member-list" aria-label="Room players">
                {model.members.map((member, index) => (
                  <li key={member.uid} className={member.ready ? "member-ready" : ""}>
                    <span className="member-avatar" aria-hidden="true">{member.displayName.slice(0, 1).toUpperCase()}</span>
                    <span><strong>{member.displayName}{member.isCurrentPlayer ? " (You)" : ""}</strong><small>{member.isHost ? "Host" : `Seat ${index + 1}`}</small></span>
                    <b>{member.ready ? "Ready" : "Choosing"}</b>
                  </li>
                ))}
                {Array.from({ length: model.maximumPlayers - model.members.length }, (_, index) => (
                  <li className="empty-seat" key={`empty-${index}`}><span className="member-avatar" aria-hidden="true">?</span><span><strong>Open seat</strong><small>Waiting for a player</small></span></li>
                ))}
              </ol>
              <div className="lobby-room-actions">
                {model.isHost ? (
                  <>
                    <p>{model.canStart ? "Everyone is ready." : "Share the code and wait for every player to be ready."}</p>
                    <button className="button button-primary button-large" disabled={!model.canStart || model.busy} onClick={() => void actions.startLobby()}>{model.operation === "start" ? "Starting..." : "Start Match"}</button>
                  </>
                ) : (
                  <button className={`button button-large ${model.currentPlayerReady ? "button-cream" : "button-primary"}`} disabled={model.busy} onClick={() => void actions.toggleReady()}>
                    {model.operation === "ready" ? "Updating..." : model.currentPlayerReady ? "Not Ready" : "I'm Ready"}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {model.screen === "ready" && (
          <section className="lobby-ready-panel">
            <span className="ready-check" aria-hidden="true">✓</span>
            <p className="playful-kicker">Room {model.roomCode}</p>
            <h1 id="lobby-title">Starting the match</h1>
            <p>The room is locked. Return home and reopen Online Play if the match does not appear.</p>
            <button className="button button-cream button-large" onClick={onExit}>Return Home</button>
          </section>
        )}
      </main>
    </div>
  );
}
