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
  "Read the evidence. Protect the patient. Call the case.";

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

const publicAsset = (filename: string) =>
  `${import.meta.env.BASE_URL}assets/${filename}`;

const duckLogoAsset = publicAsset("meducktion-medical-duck-logo.webp");
const opponentPortraits: Record<string, string> = {
  "Dr. Beak": publicAsset("opponent-dr-beak.webp"),
  Mira: publicAsset("opponent-mira.webp"),
  Patch: publicAsset("opponent-patch.webp"),
};

const tutorialPanels = [
  {
    eyebrow: "One shared case",
    title: "Review the same fictional case",
    body: "You and your opponents meet one patient and consider the same eight possible conditions.",
    symbol: "8",
  },
  {
    eyebrow: "Choose carefully",
    title: "Play one card each round",
    body: "Pick an Ask, Check, or Test question. Every card gives you a private YES or NO answer. You can change your selection before revealing it.",
    symbol: "1",
  },
  {
    eyebrow: "Follow the evidence",
    title: "Build YES and NO piles",
    body: "Your answers stay hidden from opponents. Compare your private YES and NO piles to eliminate conditions and find the best fit.",
    symbol: "?",
  },
  {
    eyebrow: "Make your diagnosis",
    title: "Guess whenever you are ready",
    body: "You have three guesses. After the first miss, choose a clue pile to hide. After the second, both piles are hidden. A third miss eliminates you.",
    symbol: "?",
  },
  {
    eyebrow: "Win the match",
    title: "First correct diagnosis wins",
    body: "There are no points and no first-place ties. The match ends as soon as one player calls the case correctly.",
    symbol: "1",
  },
] as const;

export function CardApp({ model, actions, onOpenMultiplayer, onLeaveMatch }: CardAppProps) {
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
          {...(onOpenMultiplayer ? { onOpenMultiplayer } : {})}
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
          {...(onLeaveMatch ? { onLeaveMatch } : {})}
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

function Brand({
  compact = false,
  hero = false,
}: {
  compact?: boolean;
  hero?: boolean;
}) {
  const title = hero ? (
    <h1 id="home-title">Meducktion</h1>
  ) : (
    <strong>Meducktion</strong>
  );

  return (
    <div
      className={`meducktion-brand${compact ? " brand-compact" : ""}${hero ? " brand-hero" : ""}`}
    >
      <span className="brand-wordmark">
        {title}
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
  onOpenMultiplayer,
}: ScreenProps & { onTutorial: () => void; onOpenMultiplayer?: () => void }) {
  return (
    <main id="meducktion-main" className="home-screen">
      <section className="home-copy" aria-labelledby="home-title">
        <Brand hero />
        <p className="playful-kicker">
          A competitive medical deduction card game
        </p>
        <h2 className="home-hook">Solve the case before your opponents.</h2>
        <p className="home-lede">
          Play investigation cards, uncover clues, and decide when you have
          enough evidence to diagnose. No medical experience is needed.
        </p>
        <div className="home-actions">
          <button
            className="button button-primary button-large"
            onClick={() => actions.openSetup("competitive")}
          >
            Play Local
          </button>
          {onOpenMultiplayer && (
            <button
              className="button button-cream button-large"
              onClick={onOpenMultiplayer}
            >
              Play Online
            </button>
          )}
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
      <section className="home-art" aria-label="Meducktion medical duck mascot">
        <img className="home-duck-logo" src={duckLogoAsset} alt="" />
        <div className="art-card art-card-ask" aria-hidden="true">
          <span>?</span>
          ASK
        </div>
        <div className="art-card art-card-test" aria-hidden="true">
          <span>&#x2315;</span>
          TEST
        </div>
        <div className="art-sparkle sparkle-one" aria-hidden="true">
          &#x2726;
        </div>
        <div className="art-sparkle sparkle-two" aria-hidden="true">
          &#x2605;
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
          <h1 id="setup-title">Set up your match</h1>
          <p>A mystery will be drawn at random. Build YES and NO evidence piles, then diagnose before your opponents.</p>
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
            ready for 2&ndash;4 players in local or private online rooms.
          </p>
          <button
            className="button button-primary button-large button-wide"
            disabled={!validName}
            onClick={() =>
              actions.startMatch({
                playerName: name.trim(),
                playerCount: model.setup.playerCount,
                caseId: "random",
              })
            }
          >
            Start Match
          </button>
        </section>
        <aside className="setup-summary" aria-label="Match summary">
          <div className="case-ticket">
            <span className="ticket-icon" aria-hidden="true">
              &#x2666;
            </span>
            <p>Case draw</p>
            <h2>Random mystery</h2>
            <span>Patient and scenario revealed after the draw</span>
          </div>
          <div className="opponent-ticket">
            <div className="bot-avatar" aria-hidden="true">
              <img src={opponentPortraits[model.setup.opponentName]} alt="" />
            </div>
            <div>
              <p>Your opponent</p>
              <h2>{model.setup.opponentName}</h2>
              <span>{model.setup.opponentStyle} bot</span>
            </div>
          </div>
          <ol className="micro-rules" aria-label="Short rules summary">
            <li>Choose one card each round.</li>
            <li>Use clues to narrow eight conditions.</li>
            <li>Diagnose whenever you are ready.</li>
            <li>The first correct diagnosis wins.</li>
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
          <p className="round-ribbon">Fictional case</p>
          <PatientPortrait large />
        </div>
        <div className="intro-story">
          <p className="playful-kicker">Meet the patient</p>
          <h1>{model.patient.displayName}</h1>
          <p className="patient-meta">Age {model.patient.age}</p>
          <p className="story-card">{model.patient.shortStory}</p>
          <p className="starting-clue">
            <span aria-hidden="true">&#x2726;</span>
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
            <p className="playful-kicker">Possible conditions</p>
            <h2 id="condition-title">Which condition best explains the clues?</h2>
          </div>
          <p>You do not need to know them yet. The cards will provide evidence.</p>
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
  onLeaveMatch,
}: ScreenProps & { onTutorial: () => void; onLeaveMatch?: () => void }) {
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const match = model.match;
  const onlineBlocked = model.online?.isSyncing || model.online?.isOffline;
  const selectedCard = match.hand.find((card) => card.selected);
  const diagnosisLabel = match.humanHasDiagnosed
    ? "Diagnosis submitted"
    : match.diagnosisUnlocked
      ? "Diagnose"
      : "Diagnose after reveal";
  return (
    <>
      <header className="match-header">
        <Brand compact />
        <div className="match-round-and-room">
          <RoundTracker round={match.round} maximum={match.maximumRounds} />
          {model.online && (
            <span className={`online-room-chip${model.online.isOffline ? " is-offline" : ""}`} role="status">
              <i aria-hidden="true" />
              Room {model.online.roomCode}
              {" "}
              <small>{model.online.isOffline ? "Offline" : model.online.isSyncing ? "Syncing" : "Live"}</small>
            </span>
          )}
        </div>
        <div className="match-header-actions">
          {onLeaveMatch && <button className="button button-leave-match" onClick={() => {
            if (window.confirm("Leave this match? A bot will take over your seat so the room can continue.")) onLeaveMatch();
          }}>Leave Match</button>}
          <button className="button button-header" onClick={onTutorial}>Rules</button>
          <button
            className="button button-diagnose"
            disabled={!match.diagnosisUnlocked || match.humanHasDiagnosed || onlineBlocked}
            onClick={() => setDiagnosisOpen(true)}
          >
            {diagnosisLabel}
          </button>
        </div>
      </header>
      <nav className="match-jump-nav" aria-label="Match sections">
        <a href="#patient-card">Patient</a>
        <a href="#private-evidence">Evidence</a>
        <a href="#player-hand">Your hand</a>
      </nav>
      <main id="meducktion-main" className="match-screen">
        <section className="card-table" aria-label="Meducktion card table">
          <aside className="opponent-seat" aria-labelledby="opponent-title">
            <h2 id="opponent-title" className="visually-hidden">Opponent across the table</h2>
            {match.opponents.map((opponent) => (
              <article className="opponent-player" key={opponent.id}>
                <span className="bot-avatar bot-avatar-large" aria-hidden="true">
                  {opponentPortraits[opponent.displayName]
                    ? <img src={opponentPortraits[opponent.displayName]} alt="" />
                    : opponent.avatar ?? "B"}
                </span>
                <div className="opponent-identity">
                  <strong>{opponent.displayName}</strong>
                  <small>{opponent.styleLabel} opponent</small>
                </div>
                <span className={`status-pill status-${opponent.status}`}>
                  {opponent.status === "locked" ? "Turn complete" : opponent.status === "diagnosed" ? "Diagnosed" : opponent.status === "eliminated" ? "Out" : opponent.status === "reconnecting" ? "Reconnecting" : opponent.status === "reviewing" || opponent.status === "waiting" ? "Waiting" : "Playing"}
                </span>
                <div className="opponent-card-backs" aria-label="Three face-down opponent cards">
                  {[0, 1, 2].map((index) => (
                    <span className="card-back" key={index} aria-hidden="true">
                      <img src={duckLogoAsset} alt="" />
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </aside>

          <div className="tabletop-layout">
            <section className="table-conditions" aria-labelledby="table-condition-title">
              <div className="table-section-title">
                <span aria-hidden="true">?</span>
                <div><small>Conditions</small><h2 id="table-condition-title">Possible conditions</h2></div>
              </div>
              <ConditionGrid conditions={model.conditions} compact />
            </section>

            <article id="patient-card" className="patient-table-center" aria-labelledby="patient-table-name">
              <PatientPortrait large />
              <p className="playful-kicker">Patient</p>
              <h1 id="patient-table-name">{model.patient.displayName} <small>Age {model.patient.age}</small></h1>
              <p className="patient-table-story">{model.patient.shortStory}</p>
              <div className="patient-latest-clue">
                <small>Starting symptom</small>
                <strong>{model.patient.startingSymptom}</strong>
              </div>
              <aside className="event-card" aria-label="Table event">
                <span aria-hidden="true">&#x2605;</span>
                <div><small>Table event</small><strong>{match.sharedEvent?.title ?? "Event pending"}</strong><p>{match.sharedEvent?.description ?? "One table event will appear during this match."}</p></div>
              </aside>
            </article>

            <section className="reveal-table table-reveal-zone" aria-labelledby="reveal-title" aria-live="polite">
            <div className="section-heading compact-heading">
              <div>
                <p className="playful-kicker">Center of the table</p>
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
                      <p className="hidden-clue">Opponent received an answer</p>
                    ) : reveal.effectText ? <p>{reveal.effectText}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-reveal">
                <span aria-hidden="true">&#x21bb;</span>
                <p>Played cards will be revealed here.</p>
              </div>
            )}
          </section>
          </div>
        </section>

        <section id="player-hand" className="hand-dock" aria-labelledby="hand-title">
          <div id="private-evidence" className="private-clue-zone player-private-clues" aria-labelledby="private-clue-title">
            <div><h3 id="private-clue-title">Your YES / NO evidence</h3><span>{match.privateClues.length} answers</span></div>
            <DeductionPiles clues={match.privateClues} hiddenAnswers={match.hiddenClueAnswers} />
          </div>
          <div className="hand-heading">
            <div>
              <p className="playful-kicker">Round {match.round}</p>
              <h2 id="hand-title">Your hand</h2>
              <strong className="turn-owner">{match.isYourTurn ? "Your turn" : `${match.currentTurnName}'s turn`}</strong>
              <p>{match.statusMessage}</p>
            </div>
            <div className="hand-tools">
              <button
                className="button button-small"
                disabled={!match.redrawAvailable || match.phase !== "card_selection" || !match.isYourTurn || onlineBlocked}
                onClick={actions.useRedraw}
              >
                Redraw hand
                <small>{match.redrawAvailable ? "1 free" : "Used"}</small>
              </button>
            </div>
          </div>
          {match.diagnosisBlockedUntilNextRound && (
            <p className="round-lock-note" role="status">
              That diagnosis was incorrect. You can try again next round.
            </p>
          )}
          {match.humanEliminated ? (
            <div className="spectator-card">
              <div>
                <strong>You are out of the match.</strong>
                <p>Your third diagnosis was incorrect. Watch to see who solves the case.</p>
              </div>
            </div>
          ) : match.humanHasDiagnosed ? (
            <div className="spectator-card">
              <span aria-hidden="true">&#x2713;</span>
              <div>
                <strong>Your diagnosis is submitted.</strong>
                <p>Stay at the table to see the remaining clues and final result.</p>
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
          {(match.canLock || match.canUnlock) && <div className="match-actions">
            {match.canLock && (
              <button
                className="button button-primary button-large"
                disabled={!selectedCard || onlineBlocked}
                onClick={actions.lockCard}
              >
                Reveal Card
              </button>
            )}
            {match.canUnlock && (
              <button className="button button-cream button-large" disabled={onlineBlocked} onClick={actions.unlockCard}>
                Take Back Card
              </button>
            )}
          </div>}
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
      {match.cluePilePenaltyChoiceRequired && (
        <CluePilePenaltyPanel
          disabled={Boolean(onlineBlocked)}
          onChoose={actions.chooseCluePilePenalty}
        />
      )}
    </>
  );
}

function InvestigationCard({ card, onToggle }: { card: CardView; onToggle: () => void }) {
  const label = `${categoryLabels[card.category]} question: ${card.title}. Reveals YES or NO${card.selected ? ". Selected" : ""}${card.locked ? ". Played" : ""}`;
  return (
    <button
      type="button"
      className={`investigation-card category-${card.category}${card.selected ? " is-selected" : ""}${card.locked ? " is-locked" : ""}${card.dimmed ? " is-dimmed" : ""}`}
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
      <span className="card-answer-preview" aria-hidden="true">
        <b>YES</b><i>or</i><b>NO</b>
      </span>
      {card.beginnerHint && <small>{card.beginnerHint}</small>}
      {card.locked && <span className="locked-badge">Played</span>}
      <span className="card-select-label">
        {card.locked ? "Played" : card.selected ? "Selected \u00b7 tap to change" : "Choose this card"}
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
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);

  useDialogFocus(titleRef, onClose);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conditionId) {
      setError("Choose one condition before submitting.");
      return;
    }
    onSubmit({ conditionId, clueIds: [] });
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
          &times;
        </button>
        <p className="playful-kicker">Make your diagnosis</p>
        <h2 id="diagnosis-title" ref={titleRef} tabIndex={-1}>
          Which condition explains the clues?
        </h2>
        <p>
          Pick one condition. A correct diagnosis wins immediately. You have{" "}
          <strong>{model.match.diagnosisAttemptsRemaining} attempt(s)</strong> remaining.
        </p>
        <p className="consequence-note">
          First miss: choose one evidence pile to hide. Second miss: both piles
          are hidden. Third miss: you are out of the match.
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
        <h1>Calculating results&hellip;</h1>
      </main>
    );
  }
  const human = results.rankings.find((player) => player.isHuman);
  const humanOutcome = human
    ? !results.winnerName
      ? "No player diagnosed the case correctly."
      : human.placement === 1
      ? "You solved the case first."
      : "Another player solved the case first."
    : "";

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
        <p className="playful-kicker">Match complete</p>
        <h1 id="winner-title">{results.winnerName ? `${results.winnerName} wins!` : "No winner"}</h1>
        <p>
          The correct condition was <strong>{results.hiddenDiagnosisName}</strong>.
        </p>
        {human && (
          <div className="human-result-summary">
            <p className={results.winnerName && human.placement === 1 ? "human-outcome winner-outcome" : "human-outcome"}>
              <strong>{humanOutcome}</strong>
              <span>
                {human.diagnosisCorrect
                  ? `Your ${human.diagnosisName} diagnosis was correct.`
                  : "Your final diagnosis did not solve this case."}
              </span>
            </p>
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
            <article className={`rank-card${results.winnerName && player.placement === 1 ? " rank-winner" : ""}`} key={player.playerId}>
              <span className="placement" aria-label={`Place ${player.placement}`}>
                {player.placement}
              </span>
              <div className="rank-name">
                <strong>{player.displayName}{player.isHuman ? " (you)" : ""}</strong>
                <span className={player.diagnosisCorrect ? "correct-label" : "incorrect-label"}>
                  {player.diagnosisName} &middot; {player.diagnosisCorrect ? "Correct" : "Not solved"}
                </span>
              </div>
              {results.winnerName && player.placement === 1 && <strong className="rank-total">Winner</strong>}
            </article>
          ))}
        </div>
      </section>
      <section className="recap-grid">
        <article className="learn-card">
          <p className="playful-kicker">Case explanation</p>
          <h2>Why the evidence fits</h2>
          <p>{results.explanation}</p>
          <p className="education-note">Symptoms vary from person to person. Meducktion is educational fiction, not medical advice or a diagnostic tool.</p>
        </article>
        <article className="paths-card">
          <p className="playful-kicker">Match recap</p>
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
      <button
        className="button button-primary button-large"
        disabled={model.online?.isSyncing || model.online?.isOffline}
        onClick={actions.playAgain}
      >
        Play Again
      </button>
      <Disclaimer />
    </main>
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
        &larr; {backLabel}
      </button>
      <Brand compact />
      <button className="button button-header" onClick={onTutorial}>
        How to Play
      </button>
    </header>
  );
}

function PatientPortrait({ large = false }: { large?: boolean }) {
  return (
    <div className={`patient-portrait${large ? " portrait-large" : ""}`} aria-label="Generic fictional patient mystery illustration">
      <div className="portrait-backdrop">
        <img
          className="patient-portrait-image"
          src={publicAsset("patient-mystery-placeholder.webp")}
          alt="Patient chart with a question mark, bandage, and stethoscope"
        />
      </div>
    </div>
  );
}

function ConditionGrid({ conditions, compact = false }: { conditions: CardAppModel["conditions"]; compact?: boolean }) {
  const [selectedCondition, setSelectedCondition] = useState<CardAppModel["conditions"][number] | null>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selectedCondition) return;

    dialogTitleRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetails();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedCondition]);

  function openDetails(
    condition: CardAppModel["conditions"][number],
    opener: HTMLButtonElement,
  ) {
    openerRef.current = opener;
    setSelectedCondition(condition);
  }

  function closeDetails() {
    setSelectedCondition(null);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  }

  return (
    <>
      <div
        className={`condition-grid${compact ? " condition-grid-compact" : ""}`}
        aria-label={`${conditions.length} possible conditions`}
      >
        {conditions.map((condition, index) => (
          <button
            className="condition-tile"
            type="button"
            key={condition.id}
            aria-label={`Learn about ${condition.displayName}`}
            onClick={(event) => openDetails(condition, event.currentTarget)}
          >
            <span className="condition-number" aria-hidden="true">{index + 1}</span>
            <span className="condition-icon" aria-hidden="true">{condition.icon ?? "?"}</span>
            <strong>{condition.displayName}</strong>
            <span className="condition-more">View details</span>
          </button>
        ))}
      </div>
      {selectedCondition && (
        <div
          className="modal-backdrop condition-detail-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <section
            className="condition-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="condition-detail-title"
          >
            <button
              className="modal-close"
              type="button"
              onClick={closeDetails}
              aria-label="Close condition details"
            >
              &times;
            </button>
            <span className="condition-detail-icon" aria-hidden="true">
              {selectedCondition.icon ?? "?"}
            </span>
            <p className="playful-kicker">Possible condition</p>
            <h2 id="condition-detail-title" ref={dialogTitleRef} tabIndex={-1}>
              {selectedCondition.displayName}
            </h2>
            <p className="condition-detail-description">
              {selectedCondition.learnMore ?? "No additional details are available for this condition."}
            </p>
            <button className="button button-primary" type="button" onClick={closeDetails}>
              Back to the case
            </button>
          </section>
        </div>
      )}
    </>
  );
}

function ClueList({ clues, empty }: { clues: readonly ClueView[]; empty: string }) {
  if (clues.length === 0) return <p className="empty-state">{empty}</p>;
  return (
    <ul className="clue-list">
      {clues.map((clue) => (
        <li className={clue.isNew ? "is-new" : ""} key={clue.id}>
          <span aria-hidden="true">&#x2726;</span>
          <div>
            <strong>{clue.title}</strong>
            {clue.explanation && <small>{clue.explanation}</small>}
          </div>
          <span className="clue-meta">
            <span className={`clue-visibility visibility-${clue.visibility}`}>
              {clue.visibility === "public" ? "Shared with room" : "Private to you"}
            </span>
            {clue.isNew && <span className="new-label">New</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DeductionPiles({
  clues,
  hiddenAnswers = [],
}: {
  clues: readonly ClueView[];
  hiddenAnswers?: readonly ("yes" | "no")[];
}) {
  const piles = (["yes", "no"] as const).map((answer) => ({
    answer,
    clues: clues.filter((clue) => clue.answer === answer),
  }));
  const unassigned = clues.filter((clue) => clue.answer === undefined);
  return (
    <div className="deduction-piles" aria-label="Revealed YES and NO evidence piles">
      {piles.map((pile) => (
        <section className={`deduction-pile pile-${pile.answer}${hiddenAnswers.includes(pile.answer) ? " is-hidden" : ""}`} key={pile.answer} aria-label={`${pile.answer.toUpperCase()} evidence${hiddenAnswers.includes(pile.answer) ? ", hidden" : ""}`}>
          <header><strong>{pile.answer.toUpperCase()}</strong><span>{hiddenAnswers.includes(pile.answer) ? "Hidden" : pile.clues.length}</span></header>
          {hiddenAnswers.includes(pile.answer) ? (
            <div className="hidden-evidence-pile" role="status">
              <strong>Clues hidden</strong>
              <p>This pile was covered after an incorrect diagnosis.</p>
            </div>
          ) : pile.clues.length === 0 ? <p>No answers yet</p> : pile.clues.map((clue) => (
            <article className={clue.isNew ? "is-new" : ""} key={clue.id}>
              <small>{clue.question ?? "Evidence"}</small>
              <strong>{clue.title.replace(/^Yes\s*[—-]\s*|^No\s*[—-]\s*/i, "")}</strong>
            </article>
          ))}
        </section>
      ))}
      {unassigned.length > 0 && <ClueList clues={unassigned} empty="" />}
    </div>
  );
}

function CluePilePenaltyPanel({
  disabled,
  onChoose,
}: {
  disabled: boolean;
  onChoose: (answer: "yes" | "no") => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);
  return (
    <div className="modal-backdrop">
      <section className="diagnosis-panel penalty-panel" role="dialog" aria-modal="true" aria-labelledby="penalty-title">
        <p className="playful-kicker">Incorrect diagnosis</p>
        <h2 id="penalty-title" ref={titleRef} tabIndex={-1}>Choose a pile to hide</h2>
        <p>Your first miss covers one evidence pile for the rest of this match. Future clues in that pile will also stay hidden.</p>
        <div className="penalty-pile-actions">
          <button className="button button-primary button-large" disabled={disabled} onClick={() => onChoose("yes")}>Hide YES clues</button>
          <button className="button button-primary button-large" disabled={disabled} onClick={() => onChoose("no")}>Hide NO clues</button>
        </div>
      </section>
    </div>
  );
}

function RoundTracker({ round, maximum }: { round: number; maximum: number | null }) {
  if (maximum === null) {
    return (
      <div className="round-tracker round-tracker-unlimited" aria-label={`Round ${round}, unlimited match`}>
        <span>Round</span>
        <strong>{round}</strong>
        <small>Unlimited</small>
      </div>
    );
  }
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
