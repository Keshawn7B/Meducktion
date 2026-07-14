import { useState } from "react";
import type { PatientIdentity, SymptomCard } from "../identity-content";
import { useIdentityMatch } from "../identity-hooks/useIdentityMatch";
import "./identity-game.css";

const cardName = (cards: SymptomCard[], id: string) => cards.find((card) => card.id === id)?.title ?? id;

export function IdentityGameApp() {
  const { pack, state, screen, error, canResume, actions } = useIdentityMatch();
  const [name, setName] = useState("Player");
  const [assist, setAssist] = useState<"off" | "light" | "full">("light");
  const [guessing, setGuessing] = useState(false);

  if (screen === "home") return (
    <main className="identity-shell identity-home">
      <div className="identity-wordmark">MEDUCKTION</div>
      <p className="identity-kicker">A competitive medical mystery</p>
      <h1>Read the clues.<br />Call your patient.</h1>
      <p>{pack.startingInformation} Reveal symptoms, sort YES from NO, and identify your hidden patient before Dr. Beak.</p>
      <div className="identity-actions">
        <button className="identity-primary" onClick={actions.openSetup}>Play Casual</button>
        {canResume && <button onClick={actions.resume}>Resume match</button>}
        <button onClick={actions.openTutorial}>How to play</button>
      </div>
      <small>{pack.disclaimer}</small>
    </main>
  );

  if (screen === "tutorial") return (
    <main className="identity-shell identity-panel">
      <button className="identity-back" onClick={actions.goHome}>Back</button>
      <p className="identity-kicker">How to play</p><h1>Find your hidden patient</h1>
      <ol className="identity-rules">
        <li><strong>Reveal one card.</strong> Meducktion automatically sends it to your YES or NO pile.</li>
        <li><strong>Use both piles.</strong> YES traits match your patient. NO traits eliminate possibilities.</li>
        <li><strong>Risk a guess after three reveals.</strong> You have three exact guesses.</li>
        <li><strong>Win in the earliest round.</strong> Correct guesses in the same round share the win.</li>
      </ol>
      <p>Three wrong guesses eliminate you. Decisions resolve simultaneously—click speed never decides the winner.</p>
      <button className="identity-primary" onClick={actions.openSetup}>Set up match</button>
    </main>
  );

  if (screen === "setup") return (
    <main className="identity-shell identity-panel">
      <button className="identity-back" onClick={actions.goHome}>Back</button>
      <p className="identity-kicker">Casual match</p><h1>{pack.title}</h1>
      <label className="identity-field">Your name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="identity-field">Deduction assist<select value={assist} onChange={(event) => setAssist(event.target.value as typeof assist)}><option value="off">Off</option><option value="light">Light — private markings</option><option value="full">Full — compatible identities only</option></select></label>
      <div className="identity-matchup"><span>You</span><b>VS</b><span>Dr. Beak</span></div>
      <button className="identity-primary" onClick={() => actions.start(name, assist)}>Start mystery</button>
    </main>
  );

  if (!state) return null;
  const human = state.players["player.you"]!;
  const bot = state.players["player.bot"]!;
  const latest = human.revealedCardIds.at(-1);
  const compatible = (identity: PatientIdentity) => human.yesCardIds.every((id) => identity.cardResults[id]) && human.noCardIds.every((id) => !identity.cardResults[id]);

  if (screen === "results" && state.result) {
    const humanIdentity = pack.identities.find((identity) => identity.id === human.hiddenIdentityId)!;
    const won = state.result.winnerPlayerIds.includes(human.id);
    return <main className="identity-shell identity-results">
      <p className="identity-kicker">Mystery solved</p>
      <h1>{state.result.noWinner ? "No winner this time" : state.result.winnerPlayerIds.length > 1 ? "Shared victory!" : won ? "You found your patient!" : "Dr. Beak solved it first"}</h1>
      <p>Your hidden identity was <strong>{humanIdentity.displayName}</strong>.</p>
      <p>{humanIdentity.explanation}</p>
      <section className="identity-recap">
        {state.playerOrder.map((id) => { const player = state.players[id]!; const identity = pack.identities.find((item) => item.id === player.hiddenIdentityId)!; return <article key={id}><h2>{player.displayName}: {identity.displayName}</h2><p>{player.guesses.length} guess{player.guesses.length === 1 ? "" : "es"} used</p><div><b>YES:</b> {player.yesCardIds.map((card) => cardName(pack.cards, card)).join(", ") || "None"}</div><div><b>NO:</b> {player.noCardIds.map((card) => cardName(pack.cards, card)).join(", ") || "None"}</div></article>; })}
      </section>
      <p className="identity-disclaimer">{pack.disclaimer}</p>
      <button className="identity-primary" onClick={actions.playAgain}>Play again</button>
    </main>;
  }

  const guessUnlocked = human.revealedCardIds.length >= pack.minimumRevealsBeforeGuess;
  return <main className="identity-shell identity-game">
    <header><div className="identity-wordmark">MEDUCKTION</div><div>Round <strong>{state.round}</strong></div><div>Guesses <strong>{human.remainingGuesses}/3</strong></div></header>
    <section className="identity-brief"><p className="identity-kicker">Starting information</p><h1>{pack.startingInformation}</h1><p>Your identity is hidden. Use your YES and NO evidence to find it.</p></section>
    <section className="identity-opponent"><span className="identity-avatar">DB</span><div><strong>Dr. Beak</strong><small>{bot.status === "active" ? `${bot.revealedCardIds.length} clues revealed` : bot.status}</small></div><span>{bot.remainingGuesses} guesses</span></section>
    {latest && <section className={`identity-new-card ${human.yesCardIds.includes(latest) ? "is-yes" : "is-no"}`} aria-live="polite"><span>Latest finding</span><h2>{cardName(pack.cards, latest)}</h2><strong>{human.yesCardIds.includes(latest) ? "YES — matches your patient" : "NO — does not match your patient"}</strong></section>}
    <div className="identity-piles">
      <EvidencePile title="YES" subtitle="Matches your patient" ids={human.yesCardIds} cards={pack.cards} />
      <EvidencePile title="NO" subtitle="Does not match" ids={human.noCardIds} cards={pack.cards} />
    </div>
    {human.status !== "active" && <p className="identity-spectator" role="status">You have used all three guesses. You are now watching the remaining investigator.</p>}
    {state.phase === "reveal" ? <button className="identity-reveal" onClick={actions.reveal}>{human.status === "active" ? "Reveal Symptom" : "Watch next reveal"}</button> : human.status === "active" ? <div className="identity-decision"><button className="identity-primary" disabled={!guessUnlocked} onClick={() => setGuessing(true)}>{guessUnlocked ? "Guess identity" : `Guess after ${pack.minimumRevealsBeforeGuess} reveals`}</button><button onClick={actions.continueRound}>Reveal another</button></div> : <div className="identity-decision"><button onClick={actions.continueRound}>Continue watching</button></div>}
    {error && <p role="alert" className="identity-error">{error}</p>}
    <section className="identity-board"><div><p className="identity-kicker">Private deduction board</p><h2>Who is your patient?</h2></div><p>Click identities to mark Possible, Unlikely, or Eliminated.</p><div className="identity-grid">{pack.identities.map((identity) => {
      const hiddenByAssist = state.assistMode === "full" && !compatible(identity);
      const marking = human.markings[identity.id];
      return <button key={identity.id} className={`identity-tile mark-${marking ?? "none"}`} hidden={hiddenByAssist} onClick={() => actions.mark(identity.id)}><span>{identity.family}</span><strong>{identity.displayName}</strong><small>{marking ?? "unmarked"}</small></button>;
    })}</div></section>
    {guessing && <div className="identity-modal" role="dialog" aria-modal="true" aria-labelledby="guess-title"><section><button aria-label="Close guess panel" onClick={() => setGuessing(false)}>×</button><p className="identity-kicker">Use one guess</p><h2 id="guess-title">Choose the exact identity</h2><p>Wrong guesses are not eliminated from your board automatically.</p><div className="identity-guess-grid">{pack.identities.map((identity) => <button key={identity.id} onClick={() => { setGuessing(false); actions.guess(identity.id); }}>{identity.displayName}</button>)}</div></section></div>}
  </main>;
}

function EvidencePile({ title, subtitle, ids, cards }: { title: string; subtitle: string; ids: string[]; cards: SymptomCard[] }) {
  return <section className={`identity-pile pile-${title.toLowerCase()}`}><header><div><strong>{title}</strong><small>{subtitle}</small></div><b>{ids.length}</b></header><div>{ids.length ? ids.map((id) => <article key={id}>{cardName(cards, id)}</article>) : <p>No cards yet</p>}</div></section>;
}
