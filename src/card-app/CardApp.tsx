import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type {
  CardAppActions,
  CardAppModel,
  CardAppProps,
  CardCategory,
  CardView,
  ClueView,
  DiagnosisInput,
} from "./types";
import "./card-app.css";

export const MEDUCKTION_TAGLINE =
  "Reveal the clues. Solve the case. Outsmart the room.";

export const MEDUCKTION_DISCLAIMER =
  "Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.";

const categoryIcons: Record<CardCategory, string> = {
  ask: "?",
  check: "\u2726",
  test: "\u2315",
  special: "\u2605",
};

const categoryLabels: Record<CardCategory, string> = {
  ask: "Ask",
  check: "Check",
  test: "Test",
  special: "Special",
};

const tutorialPanels = [
  {
    eyebrow: "One mystery, one room",
    title: "Solve the same fictional case",
    body: "You and your opponents meet one patient and consider the same four possible conditions.",
    symbol: "4",
  },
  {
    eyebrow: "Choose wisely",
    title: "Play one card each round",
    body: "Pick an Ask, Check, Test, or Special card from your hand. You can change your mind before locking it.",
    symbol: "1",
  },
  {
    eyebrow: "Follow the trail",
    title: "Cards reveal clues",
    body: "Some clues are shared with the room. Others stay private, giving you your own path to the answer.",
    symbol: "?",
  },
  {
    eyebrow: "Make your call",
    title: "Diagnose after Round 2",
    body: "Choose one condition and two clues that shaped your decision. A wrong guess costs 150 points, but you keep playing.",
    symbol: "2",
  },
  {
    eyebrow: "Win the room",
    title: "Highest score wins",
    body: "Earn points for the right diagnosis, useful supporting clues, good timing, and focused investigating.",
    symbol: "1K",
  },
] as const;

export function CardApp({ model, actions }: CardAppProps) {
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <div className="meducktion-app">
      <a className="meducktion-skip-link" href="#meducktion-main">
        Skip to game content
      </a>
      {model.screen === "home" && (
        <HomeScreen
          model={model}
          actions={actions}
          onTutorial={() => setTutorialOpen(true)}
        />
      )}
      {model.screen === "setup" && (
        <SetupScreen
          model={model}
          actions={actions}
          onTutorial={() => setTutorialOpen(true)}
        />
      )}
      {model.screen === "patient_intro" && (
        <PatientIntro
          model={model}
          actions={actions}
          onTutorial={() => setTutorialOpen(true)}
        />
      )}
      {model.screen === "match" && (
        <MatchScreen
          model={model}
          actions={actions}
          onTutorial={() => setTutorialOpen(true)}
        />
      )}
      {model.screen === "results" && (
        <ResultsScreen model={model} actions={actions} />
      )}
      {model.errorMessage && (
        <p className="global-game-error" role="alert" aria-live="assertive">
          {model.errorMessage}
        </p>
      )}
      {tutorialOpen && (
        <TutorialOverlay onClose={() => setTutorialOpen(false)} />
      )}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`meducktion-brand${compact ? " brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <span>m</span>
      </span>
      <span>
        <strong>Meducktion</strong>
        {!compact && <small>{MEDUCKTION_TAGLINE}</small>}
      </span>
    </div>
  );
}

function Disclaimer() {
  return <p className="meducktion-disclaimer">{MEDUCKTION_DISCLAIMER}</p>;
}

function HomeScreen({
  model,
  actions,
  onTutorial,
}: ScreenProps & { onTutorial: () => void }) {
  return (
    <main id="meducktion-main" className="home-screen">
      <section className="home-copy" aria-labelledby="home-title">
        <Brand />
        <p className="playful-kicker">A cozy competitive medical mystery</p>
        <h1 id="home-title">Can you crack the case first?</h1>
        <p className="home-lede">
          Draw investigation cards, uncover friendly clues, and decide when you
          know enough to call the case. No medical experience needed.
        </p>
        <div className="home-actions">
          <button
            className="button button-primary button-large"
            onClick={() => actions.openSetup("competitive")}
          >
            Play
          </button>
          <button className="button button-cream" onClick={onTutorial}>
            How to Play
          </button>
          <button
            className="button button-text"
            onClick={() => actions.openSetup("practice")}
          >
            Practice
          </button>
          {model.canResume && (
            <button className="button button-text" onClick={actions.resumeMatch}>
              Resume match
            </button>
          )}
        </div>
        {model.legacySaveNotice && (
          <p className="save-notice" role="status">
            {model.legacySaveNotice}
          </p>
        )}
        <Disclaimer />
      </section>
      <section className="home-art" aria-label="Jordan waits in a cozy clinic room">
        <div className="clinic-window" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <PatientPortrait name={model.patient.displayName} large />
        <div className="art-card art-card-ask" aria-hidden="true">
          <span>?</span>
          ASK
        </div>
        <div className="art-card art-card-test" aria-hidden="true">
          <span>\u2315</span>
          TEST
        </div>
        <div className="art-sparkle sparkle-one" aria-hidden="true">
          \u2726
        </div>
        <div className="art-sparkle sparkle-two" aria-hidden="true">
          \u2605
        </div>
      </section>
    </main>
  );
}

type ScreenProps = {
  model: CardAppModel;
  actions: CardAppActions;
};

function SetupScreen({
  model,
  actions,
  onTutorial,
}: ScreenProps & { onTutorial: () => void }) {
  const [name, setName] = useState(model.setup.suggestedPlayerName);
  const nameId = useId();
  const validName = name.trim().length > 0;

  return (
    <main id="meducktion-main" className="page-shell setup-screen">
      <PageHeader
        onBack={actions.goHome}
        onTutorial={onTutorial}
        backLabel="Back home"
      />
      <div className="setup-grid">
        <section className="paper-panel setup-panel" aria-labelledby="setup-title">
          <p className="playful-kicker">Local match setup</p>
          <h1 id="setup-title">Ready, detective?</h1>
          <p>One quick mystery. Four rounds. Highest score wins.</p>
          <label className="field-label" htmlFor={nameId}>
            Your player name
          </label>
          <input
            id={nameId}
            className="text-input"
            value={name}
            maxLength={24}
            autoComplete="nickname"
            onChange={(event) => setName(event.target.value)}
          />
          <label className="field-label" htmlFor="player-count">
            Players
          </label>
          <select id="player-count" className="text-input" value={model.setup.playerCount} disabled>
            <option value={model.setup.playerCount}>
              {model.setup.playerCount} players (local preview)
            </option>
          </select>
          <p className="field-note">
            This match uses one human and one deterministic bot. The rules are
            ready for 2\u20134 players; online rooms come later.
          </p>
          <button
            className="button button-primary button-large button-wide"
            disabled={!validName}
            onClick={() =>
              actions.startMatch({
                playerName: name.trim(),
                playerCount: model.setup.playerCount,
              })
            }
          >
            Start Match
          </button>
        </section>
        <aside className="setup-summary" aria-label="Match summary">
          <div className="case-ticket">
            <span className="ticket-icon" aria-hidden="true">
              \u2666
            </span>
            <p>Tonight's mystery</p>
            <h2>{model.setup.selectedCaseName}</h2>
            <span>Fictional case \u00b7 Beginner friendly</span>
          </div>
          <div className="opponent-ticket">
            <div className="bot-avatar" aria-hidden="true">
              B
            </div>
            <div>
              <p>Your opponent</p>
              <h2>{model.setup.opponentName}</h2>
              <span>{model.setup.opponentStyle} bot</span>
            </div>
          </div>
          <ol className="micro-rules" aria-label="Short rules summary">
            <li>Choose one card each round.</li>
            <li>Use clues to narrow four conditions.</li>
            <li>Diagnose after Round 2 for bonus points.</li>
          </ol>
        </aside>
      </div>
      <Disclaimer />
    </main>
  );
}

function PatientIntro({
  model,
  actions,
  onTutorial,
}: ScreenProps & { onTutorial: () => void }) {
  return (
    <main id="meducktion-main" className="page-shell intro-screen">
      <PageHeader
        onBack={actions.goHome}
        onTutorial={onTutorial}
        backLabel="Leave match"
      />
      <section className="intro-stage">
        <div className="intro-portrait-wrap">
          <p className="round-ribbon">Mystery case \u00b7 4 rounds</p>
          <PatientPortrait name={model.patient.displayName} large />
        </div>
        <div className="intro-story">
          <p className="playful-kicker">Meet the patient</p>
          <h1>{model.patient.displayName}</h1>
          <p className="patient-meta">Age {model.patient.age}</p>
          <p className="story-card">{model.patient.shortStory}</p>
          <p className="starting-clue">
            <span aria-hidden="true">\u2726</span>
            <span>
              <small>Starting clue</small>
              <strong>{model.patient.startingSymptom}</strong>
            </span>
          </p>
        </div>
      </section>
      <section className="condition-section" aria-labelledby="condition-title">
        <div className="section-heading">
          <div>
            <p className="playful-kicker">The possibilities</p>
            <h2 id="condition-title">Which condition explains the clues?</h2>
          </div>
          <p>You do not need to know these yet. The cards will help.</p>
        </div>
        <ConditionGrid conditions={model.conditions} />
      </section>
      <div className="intro-action">
        <button
          className="button button-primary button-large"
          onClick={actions.dealCards}
        >
          Deal Cards
        </button>
        <span>Three cards are waiting in your first hand.</span>
      </div>
      <Disclaimer />
    </main>
  );
}

function MatchScreen({
  model,
  actions,
  onTutorial,
}: ScreenProps & { onTutorial: () => void }) {
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const match = model.match;
  const selectedCard = match.hand.find((card) => card.selected);

  return (
    <>
      <header className="match-header">
        <Brand compact />
        <RoundTracker round={match.round} maximum={match.maximumRounds} />
        <button className="button button-header" onClick={onTutorial}>
          Rules
        </button>
      </header>
      <nav className="match-jump-nav" aria-label="Match sections">
        <a href="#patient-card">Patient</a>
        <a href="#clue-board">Clues</a>
        <a href="#player-hand">Your hand</a>
      </nav>
      <main id="meducktion-main" className="match-screen">
        <section id="patient-card" className="match-top" aria-label="Patient and conditions">
          <article className="patient-banner">
            <PatientPortrait name={model.patient.displayName} />
            <div>
              <p className="playful-kicker">Today's mystery</p>
              <h1>{model.patient.displayName}</h1>
              <p>{model.patient.shortStory}</p>
            </div>
          </article>
          <div className="compact-conditions">
            <h2>Possible conditions</h2>
            <ConditionGrid conditions={model.conditions} compact />
          </div>
          <aside className="event-slot" aria-label="Shared event">
            <span aria-hidden="true">\u2605</span>
            {match.sharedEvent ? (
              <div>
                <small>Shared event</small>
                <strong>{match.sharedEvent.title}</strong>
                <p>{match.sharedEvent.description}</p>
              </div>
            ) : (
              <div>
                <small>Shared event</small>
                <strong>A surprise is coming</strong>
                <p>One friendly twist will appear this match.</p>
              </div>
            )}
          </aside>
        </section>

        <div className="match-middle">
          <section id="clue-board" className="clue-board" aria-labelledby="clue-title">
            <div className="section-heading compact-heading">
              <div>
                <p className="playful-kicker">Room knowledge</p>
                <h2 id="clue-title">Shared clue board</h2>
              </div>
              <span className="count-pill">{match.publicClues.length} found</span>
            </div>
            <ClueList clues={match.publicClues} empty="Play cards to reveal shared clues." />
            <div className="private-clue-zone">
              <div>
                <h3>Your private clues</h3>
                <span>Only you can read these during the match.</span>
              </div>
              <ClueList clues={match.privateClues} empty="No private clues yet." />
            </div>
          </section>

          <section className="reveal-table" aria-labelledby="reveal-title" aria-live="polite">
            <div className="section-heading compact-heading">
              <div>
                <p className="playful-kicker">Latest play</p>
                <h2 id="reveal-title">Card reveal</h2>
              </div>
            </div>
            {match.latestReveals.length > 0 ? (
              <div className="reveal-grid">
                {match.latestReveals.map((reveal) => (
                  <article className={`reveal-card category-${reveal.category}`} key={`${reveal.playerId}-${reveal.cardTitle}`}>
                    <span className="category-badge">
                      <span aria-hidden="true">{categoryIcons[reveal.category]}</span>
                      {categoryLabels[reveal.category]}
                    </span>
                    <small>{reveal.playerName} played</small>
                    <h3>{reveal.cardTitle}</h3>
                    {reveal.clue ? (
                      <p>{reveal.clue.title}</p>
                    ) : reveal.clueIsHidden ? (
                      <p className="hidden-clue">Private clue collected</p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-reveal">
                <span aria-hidden="true">\u21bb</span>
                <p>Locked cards will flip here for everyone to see.</p>
              </div>
            )}
          </section>

          <aside className="opponent-panel" aria-labelledby="opponent-title">
            <h2 id="opponent-title">Around the room</h2>
            {match.opponents.map((opponent) => (
              <article className="opponent-row" key={opponent.id}>
                <span className="bot-avatar" aria-hidden="true">
                  {opponent.avatar ?? "B"}
                </span>
                <div>
                  <strong>{opponent.displayName}</strong>
                  <small>{opponent.styleLabel}</small>
                </div>
                <span className={`status-pill status-${opponent.status}`}>
                  {opponent.status === "locked"
                    ? "Card locked"
                    : opponent.status === "diagnosed"
                      ? "Diagnosis in"
                      : opponent.status === "reviewing"
                        ? "Reviewing clues"
                        : "Choosing"}
                </span>
              </article>
            ))}
            <p className="privacy-note">
              You can see an opponent's card category after reveal, but their
              private clue stays hidden.
            </p>
          </aside>
        </div>

        <section id="player-hand" className="hand-dock" aria-labelledby="hand-title">
          <div className="hand-heading">
            <div>
              <p className="playful-kicker">Round {match.round}</p>
              <h2 id="hand-title">Your hand</h2>
              <p>{match.statusMessage}</p>
            </div>
            <div className="hand-tools">
              <button
                className="button button-small"
                disabled={!match.redrawAvailable || match.phase !== "card_selection"}
                onClick={actions.useRedraw}
              >
                Redraw hand
                <small>{match.redrawAvailable ? "1 free" : "Used"}</small>
              </button>
              <button
                className="button button-diagnose"
                disabled={!match.diagnosisUnlocked || match.humanHasDiagnosed}
                onClick={() => setDiagnosisOpen(true)}
              >
                {match.humanHasDiagnosed
                  ? "Diagnosis submitted"
                  : match.diagnosisUnlocked
                    ? "Diagnose"
                    : "Diagnose after Round 2"}
              </button>
            </div>
          </div>
          {match.diagnosisBlockedUntilNextRound && (
            <p className="round-lock-note" role="status">
              Your first guess was incorrect. You can try again next round.
            </p>
          )}
          {match.humanHasDiagnosed ? (
            <div className="spectator-card">
              <span aria-hidden="true">\u2713</span>
              <div>
                <strong>Your diagnosis is in.</strong>
                <p>Stay at the table to watch the remaining clues and final reveal.</p>
              </div>
            </div>
          ) : (
            <div className="card-hand" role="group" aria-label="Choose one investigation card">
              {match.hand.map((card) => (
                <InvestigationCard
                  key={card.id}
                  card={card}
                  onToggle={() => actions.toggleCard(card.id)}
                />
              ))}
            </div>
          )}
          <div className="match-actions">
            {match.canLock && (
              <button
                className="button button-primary button-large"
                disabled={!selectedCard}
                onClick={actions.lockCard}
              >
                Lock Card
              </button>
            )}
            {match.canReveal && (
              <button className="button button-primary button-large" onClick={actions.revealCards}>
                Reveal Cards
              </button>
            )}
            {match.canAdvance && (
              <button className="button button-primary button-large" onClick={actions.advanceRound}>
                {match.round === match.maximumRounds ? "Finish Match" : "Next Round"}
              </button>
            )}
          </div>
        </section>
      </main>
      <p className="visually-hidden" aria-live="polite">
        {match.statusMessage}
      </p>
      {diagnosisOpen && (
        <DiagnosisPanel
          model={model}
          onClose={() => setDiagnosisOpen(false)}
          onSubmit={(input) => {
            actions.submitDiagnosis(input);
            setDiagnosisOpen(false);
          }}
        />
      )}
    </>
  );
}

function InvestigationCard({ card, onToggle }: { card: CardView; onToggle: () => void }) {
  const label = `${categoryLabels[card.category]} card: ${card.title}. ${card.description}${card.selected ? ". Selected" : ""}${card.locked ? ". Locked" : ""}`;
  return (
    <button
      type="button"
      className={`investigation-card category-${card.category}${card.selected ? " is-selected" : ""}${card.locked ? " is-locked" : ""}`}
      aria-label={label}
      aria-pressed={card.selected}
      disabled={card.disabled || card.locked}
      onClick={onToggle}
    >
      <span className="card-category">
        <span className="card-symbol" aria-hidden="true">
          {card.icon ?? categoryIcons[card.category]}
        </span>
        {categoryLabels[card.category]}
      </span>
      <span className="card-copy">
        <strong>{card.title}</strong>
        <span>{card.description}</span>
      </span>
      {card.beginnerHint && <small>{card.beginnerHint}</small>}
      <span className="card-select-label">
        {card.locked ? "Locked" : card.selected ? "Selected \u00b7 tap to change" : "Choose this card"}
      </span>
    </button>
  );
}

function DiagnosisPanel({
  model,
  onClose,
  onSubmit,
}: {
  model: CardAppModel;
  onClose: () => void;
  onSubmit: (input: DiagnosisInput) => void;
}) {
  const [conditionId, setConditionId] = useState("");
  const [clueIds, setClueIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const clues = [...model.match.publicClues, ...model.match.privateClues];

  useDialogFocus(titleRef, onClose);

  function toggleClue(id: string) {
    setError("");
    setClueIds((current) =>
      current.includes(id)
        ? current.filter((clueId) => clueId !== id)
        : current.length < 2
          ? [...current, id]
          : current,
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conditionId || clueIds.length !== 2) {
      setError("Choose one condition and exactly two clues before submitting.");
      return;
    }
    const first = clueIds[0];
    const second = clueIds[1];
    if (!first || !second) return;
    onSubmit({ conditionId, clueIds: [first, second] });
  }

  return (
    <div className="modal-backdrop">
      <section
        className="diagnosis-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagnosis-title"
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close diagnosis panel">
          \u00d7
        </button>
        <p className="playful-kicker">Make your call</p>
        <h2 id="diagnosis-title" ref={titleRef} tabIndex={-1}>
          What explains the clues?
        </h2>
        <p>
          Pick one condition and two clues that influenced you. You have{" "}
          <strong>{model.match.diagnosisAttemptsRemaining} attempt(s)</strong> remaining.
        </p>
        <p className="consequence-note">
          A wrong diagnosis costs 150 points. Your clues stay with you, and you
          can keep investigating.
        </p>
        <form onSubmit={submit} noValidate>
          <fieldset className="diagnosis-choices">
            <legend>Choose a condition</legend>
            {model.conditions.map((condition) => (
              <label key={condition.id}>
                <input
                  type="radio"
                  name="condition"
                  value={condition.id}
                  checked={conditionId === condition.id}
                  onChange={() => {
                    setConditionId(condition.id);
                    setError("");
                  }}
                />
                <span aria-hidden="true">{condition.icon ?? "?"}</span>
                <strong>{condition.displayName}</strong>
              </label>
            ))}
          </fieldset>
          <fieldset className="diagnosis-clues">
            <legend>
              Choose exactly two clues <span>{clueIds.length}/2</span>
            </legend>
            {clues.length > 0 ? (
              clues.map((clue) => (
                <label key={clue.id}>
                  <input
                    type="checkbox"
                    checked={clueIds.includes(clue.id)}
                    disabled={!clueIds.includes(clue.id) && clueIds.length === 2}
                    onChange={() => toggleClue(clue.id)}
                  />
                  <span>{clue.title}</span>
                  <small>{clue.visibility === "public" ? "Shared clue" : "Your private clue"}</small>
                </label>
              ))
            ) : (
              <p className="empty-state">Reveal more clues before making a diagnosis.</p>
            )}
          </fieldset>
          {error && (
            <p className="form-error" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
          <button className="button button-primary button-large button-wide" type="submit">
            Confirm Diagnosis
          </button>
        </form>
      </section>
    </div>
  );
}

function ResultsScreen({ model, actions }: ScreenProps) {
  const results = model.results;
  if (!results) {
    return (
      <main id="meducktion-main" className="page-shell results-screen">
        <h1>Results are being counted\u2026</h1>
      </main>
    );
  }
  const human = results.rankings.find((player) => player.isHuman);

  return (
    <main id="meducktion-main" className="page-shell results-screen">
      <div className="winner-burst" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <section className="winner-hero" aria-labelledby="winner-title">
        <p className="playful-kicker">Mystery solved</p>
        <h1 id="winner-title">{results.winnerName} wins the room!</h1>
        <p>
          The hidden condition was <strong>{results.hiddenDiagnosisName}</strong>.
        </p>
        {human && (
          <div className="human-score">
            <span>Your score</span>
            <strong>{human.totalScore}</strong>
            <small>/ 1,000 points</small>
          </div>
        )}
      </section>
      <section className="ranking-panel" aria-labelledby="ranking-title">
        <div className="section-heading compact-heading">
          <div>
            <p className="playful-kicker">Final standings</p>
            <h2 id="ranking-title">Player rankings</h2>
          </div>
        </div>
        <div className="rank-list">
          {results.rankings.map((player) => (
            <article className={`rank-card${player.placement === 1 ? " rank-winner" : ""}`} key={player.playerId}>
              <span className="placement" aria-label={`Place ${player.placement}`}>
                {player.placement}
              </span>
              <div className="rank-name">
                <strong>{player.displayName}{player.isHuman ? " (you)" : ""}</strong>
                <span className={player.diagnosisCorrect ? "correct-label" : "incorrect-label"}>
                  {player.diagnosisName} \u00b7 {player.diagnosisCorrect ? "Correct" : "Not solved"}
                </span>
              </div>
              <strong className="rank-total">{player.totalScore}</strong>
              <ScoreDetails player={player} />
            </article>
          ))}
        </div>
      </section>
      <section className="recap-grid">
        <article className="learn-card">
          <p className="playful-kicker">Why it fits</p>
          <h2>The mystery, explained simply</h2>
          <p>{results.explanation}</p>
          <p className="education-note">This explanation applies only to this authored fictional case.</p>
        </article>
        <article className="paths-card">
          <p className="playful-kicker">The routes taken</p>
          <h2>Investigation paths</h2>
          {results.rankings.map((player) => (
            <div className="player-path" key={player.playerId}>
              <strong>{player.displayName}</strong>
              <ol>
                {player.investigationPath.map((cardName, index) => (
                  <li key={`${cardName}-${index}`}>{cardName}</li>
                ))}
              </ol>
            </div>
          ))}
        </article>
      </section>
      <button className="button button-primary button-large" onClick={actions.playAgain}>
        Play Again
      </button>
      <Disclaimer />
    </main>
  );
}

function ScoreDetails({ player }: { player: NonNullable<CardAppModel["results"]>["rankings"][number] }) {
  const score = player.breakdown;
  return (
    <details className="score-details">
      <summary>Score details</summary>
      <dl>
        <div><dt>Correct diagnosis</dt><dd>{score.correctDiagnosis}</dd></div>
        <div><dt>Supporting clues</dt><dd>{score.supportingClues}</dd></div>
        <div><dt>Timing</dt><dd>{score.timing}</dd></div>
        <div><dt>Efficient investigation</dt><dd>{score.efficiency}</dd></div>
        <div><dt>Achievement</dt><dd>{score.achievement}</dd></div>
        <div><dt>Wrong-attempt penalties</dt><dd>{score.wrongAttemptPenalties}</dd></div>
      </dl>
      {player.achievementName && <p className="achievement-chip">\u2605 {player.achievementName}</p>}
    </details>
  );
}

function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const [panel, setPanel] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const step = tutorialPanels[panel];
  useDialogFocus(titleRef, onClose);
  if (!step) return null;

  return (
    <div className="modal-backdrop tutorial-backdrop">
      <section className="tutorial" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        <button className="tutorial-skip" type="button" onClick={onClose}>
          Skip tutorial
        </button>
        <div className="tutorial-progress" aria-label={`Tutorial step ${panel + 1} of ${tutorialPanels.length}`}>
          {tutorialPanels.map((item, index) => (
            <span className={index === panel ? "current" : ""} key={item.title} />
          ))}
        </div>
        <div className="tutorial-symbol" aria-hidden="true">{step.symbol}</div>
        <p className="playful-kicker">{step.eyebrow}</p>
        <h2 id="tutorial-title" ref={titleRef} tabIndex={-1}>{step.title}</h2>
        <p>{step.body}</p>
        <div className="tutorial-actions">
          <button
            className="button button-cream"
            type="button"
            disabled={panel === 0}
            onClick={() => setPanel((current) => Math.max(0, current - 1))}
          >
            Back
          </button>
          {panel === tutorialPanels.length - 1 ? (
            <button className="button button-primary" type="button" onClick={onClose}>
              Got it
            </button>
          ) : (
            <button className="button button-primary" type="button" onClick={() => setPanel((current) => current + 1)}>
              Next
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function PageHeader({
  onBack,
  onTutorial,
  backLabel,
}: {
  onBack: () => void;
  onTutorial: () => void;
  backLabel: string;
}) {
  return (
    <header className="page-header">
      <button className="button button-header" onClick={onBack}>
        \u2190 {backLabel}
      </button>
      <Brand compact />
      <button className="button button-header" onClick={onTutorial}>
        How to Play
      </button>
    </header>
  );
}

function PatientPortrait({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <div className={`patient-portrait${large ? " portrait-large" : ""}`} aria-label={`Friendly illustrated portrait of ${name}`}>
      <div className="portrait-backdrop" aria-hidden="true">
        <span className="portrait-hair" />
        <span className="portrait-face">
          <i className="portrait-eye eye-left" />
          <i className="portrait-eye eye-right" />
          <i className="portrait-smile" />
        </span>
        <span className="portrait-neck" />
        <span className="portrait-shirt" />
        <span className="portrait-badge">J</span>
      </div>
    </div>
  );
}

function ConditionGrid({ conditions, compact = false }: { conditions: CardAppModel["conditions"]; compact?: boolean }) {
  return (
    <div className={`condition-grid${compact ? " condition-grid-compact" : ""}`}>
      {conditions.map((condition, index) => (
        <article className="condition-tile" key={condition.id}>
          <span className="condition-number" aria-hidden="true">{index + 1}</span>
          <span className="condition-icon" aria-hidden="true">{condition.icon ?? "?"}</span>
          <strong>{condition.displayName}</strong>
          {!compact && condition.learnMore && (
            <details>
              <summary>Learn more</summary>
              <p>{condition.learnMore}</p>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}

function ClueList({ clues, empty }: { clues: readonly ClueView[]; empty: string }) {
  if (clues.length === 0) return <p className="empty-state">{empty}</p>;
  return (
    <ul className="clue-list">
      {clues.map((clue) => (
        <li className={clue.isNew ? "is-new" : ""} key={clue.id}>
          <span aria-hidden="true">\u2726</span>
          <div>
            <strong>{clue.title}</strong>
            {clue.explanation && <small>{clue.explanation}</small>}
          </div>
          {clue.isNew && <span className="new-label">New</span>}
        </li>
      ))}
    </ul>
  );
}

function RoundTracker({ round, maximum }: { round: number; maximum: number }) {
  return (
    <div className="round-tracker" aria-label={`Round ${round} of ${maximum}`}>
      <span>Round</span>
      <ol>
        {Array.from({ length: maximum }, (_, index) => (
          <li
            className={index + 1 < round ? "complete" : index + 1 === round ? "current" : ""}
            key={index}
            aria-label={`Round ${index + 1}${index + 1 === round ? ", current" : index + 1 < round ? ", complete" : ""}`}
          >
            {index + 1}
          </li>
        ))}
      </ol>
    </div>
  );
}

function useDialogFocus(
  headingRef: { readonly current: HTMLHeadingElement | null },
  onClose: () => void,
) {
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    headingRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previous?.focus();
    };
  }, [headingRef, onClose]);
}
