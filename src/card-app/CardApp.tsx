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

const opponentPortraits: Record<string, string> = {
  "Dr. Beak": publicAsset("opponent-dr-beak.webp"),
  Mira: publicAsset("opponent-mira.webp"),
  Patch: publicAsset("opponent-patch.webp"),
};

const tutorialPanels = [
  {
    eyebrow: "One patient, many opinions",
    title: "Everybody gets the same weird case",
    body: "You and your opponents meet one fictional patient and eye the same four suspicious conditions.",
    symbol: "4",
  },
  {
    eyebrow: "Choose your trouble",
    title: "Play one card each round",
    body: "Pick an Ask, Check, Test, or Special card. You may change your mind before locking, and one full-hand do-over is on the house.",
    symbol: "1",
  },
  {
    eyebrow: "Follow the oddities",
    title: "Every card makes the plot wobble",
    body: "Some clues land where everyone can see them. Others sneak into your private stash and give you a secret route to the answer.",
    symbol: "?",
  },
  {
    eyebrow: "Put on your serious face",
    title: "Diagnose after Round 2",
    body: "After each reveal from Round 2 onward, call the case or keep snooping. A wrong guess costs 150 points, but nobody confiscates your magnifying glass.",
    symbol: "2",
  },
  {
    eyebrow: "Rule the waiting room",
    title: "Highest score wins",
    body: "Earn points for the right diagnosis, useful evidence, sharp timing, and resisting the urge to investigate absolutely everything.",
    symbol: "1K",
  },
] as const;

export function CardApp({ model, actions, onOpenMultiplayer }: CardAppProps) {
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
      <span className="brand-mark" aria-hidden="true">
        <span>m</span>
      </span>
      <span>
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
          A cozy card mystery with highly suspicious symptoms
        </p>
        <h2 className="home-hook">Outwit the clues. Outsmart the quacks.</h2>
        <p className="home-lede">
          Ask awkward questions, run cartoonishly serious tests, and call the
          case before another armchair expert does. No medical experience needed.
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
      <section className="home-art" aria-label="Jordan waits in a cozy clinic room">
        <PatientPortrait name={model.patient.displayName} large />
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
          <p className="playful-kicker">Waiting-room roll call</p>
          <h1 id="setup-title">Name badge on. Game face questionable.</h1>
          <p>One baffled patient. Four quick rounds. May the sharpest snoop win.</p>
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
            ready for 2&ndash;4 players; online rooms come later.
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
              &#x2666;
            </span>
            <p>Tonight's medical mischief</p>
            <h2>{model.setup.selectedCaseName}</h2>
            <span>Entirely fictional &middot; Friendly to curious humans</span>
          </div>
          <div className="opponent-ticket">
            <div className="bot-avatar" aria-hidden="true">
              <img src={opponentPortraits[model.setup.opponentName]} alt="" />
            </div>
            <div>
              <p>Your suspiciously confident rival</p>
              <h2>{model.setup.opponentName}</h2>
              <span>{model.setup.opponentStyle} bot instincts</span>
            </div>
          </div>
          <ol className="micro-rules" aria-label="Short rules summary">
            <li>Pick one piece of trouble each round.</li>
            <li>Use the oddities to narrow four suspects.</li>
            <li>Call the case after Round 2 for timing points.</li>
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
          <p className="round-ribbon">Case file escaped &middot; 4 rounds</p>
          <PatientPortrait name={model.patient.displayName} large />
        </div>
        <div className="intro-story">
          <p className="playful-kicker">Meet the human plot twist</p>
          <h1>{model.patient.displayName}</h1>
          <p className="patient-meta">Age {model.patient.age}</p>
          <p className="story-card">{model.patient.shortStory}</p>
          <p className="starting-clue">
            <span aria-hidden="true">&#x2726;</span>
            <span>
              <small>The first oddity</small>
              <strong>{model.patient.startingSymptom}</strong>
            </span>
          </p>
        </div>
      </section>
      <section className="condition-section" aria-labelledby="condition-title">
        <div className="section-heading">
          <div>
            <p className="playful-kicker">The usual suspects</p>
            <h2 id="condition-title">Which condition is causing the commotion?</h2>
          </div>
          <p>No need to know them yet. The cards do the awkward questioning.</p>
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
        <span>Three suspiciously helpful cards are waiting in your first hand.</span>
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
  const diagnosisLabel = match.humanHasDiagnosed
    ? "Diagnosis submitted"
    : match.diagnosisUnlocked
      ? "Diagnose"
      : match.round < 2
        ? "Diagnose after Round 2"
        : "Diagnose after reveal";
  const roundDecisionMessage = match.mustDiagnose
    ? "This is the final round. Choose a condition and two clues before finishing."
    : match.humanHasDiagnosed
    ? "Your diagnosis is locked in. Continue to see how the room finishes."
    : match.diagnosisBlockedUntilNextRound
      ? "Your next diagnosis attempt unlocks next round. Keep investigating."
      : match.diagnosisUnlocked
        ? "Call the case now for more timing points, or keep investigating."
        : "Diagnosis unlocks after Round 2. Continue investigating for now.";

  return (
    <>
      <header className="match-header">
        <Brand compact />
        <RoundTracker round={match.round} maximum={match.maximumRounds} />
        <div className="match-header-actions">
          <button className="button button-header" onClick={onTutorial}>Rules</button>
          <button
            className="button button-diagnose"
            disabled={!match.diagnosisUnlocked || match.humanHasDiagnosed}
            onClick={() => setDiagnosisOpen(true)}
          >
            {diagnosisLabel}
          </button>
        </div>
      </header>
      <nav className="match-jump-nav" aria-label="Match sections">
        <a href="#patient-card">Patient</a>
        <a href="#clue-board">Clue pile</a>
        <a href="#player-hand">Your cards</a>
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
                  {opponent.status === "locked" ? "Locked" : opponent.status === "diagnosed" ? "Diagnosed" : opponent.status === "reviewing" ? "Waiting" : "Choosing"}
                </span>
                <div className="opponent-card-backs" aria-label="Three face-down opponent cards">
                  {[0, 1, 2].map((index) => <span className="card-back" key={index} aria-hidden="true"><i>M</i></span>)}
                </div>
              </article>
            ))}
          </aside>

          <div className="tabletop-layout">
            <section className="table-conditions" aria-labelledby="table-condition-title">
              <div className="table-section-title">
                <span aria-hidden="true">?</span>
                <div><small>Medical mischief makers</small><h2 id="table-condition-title">The four usual suspects</h2></div>
              </div>
              <ConditionGrid conditions={model.conditions} compact />
            </section>

            <article id="patient-card" className="patient-table-center" aria-labelledby="patient-table-name">
              <div className="patient-round-pips" aria-label={`Round ${match.round} of ${match.maximumRounds}`}>
                {Array.from({ length: match.maximumRounds }, (_, index) => <span key={index} className={index < match.round ? "is-current" : ""}>{index + 1}</span>)}
              </div>
              <PatientPortrait name={model.patient.displayName} large />
              <p className="playful-kicker">Human at the center of the chaos</p>
              <h1 id="patient-table-name">{model.patient.displayName} <small>Age {model.patient.age}</small></h1>
              <p className="patient-table-story">{model.patient.shortStory}</p>
              <div className="patient-latest-clue">
                <small>Latest public oddity</small>
                <strong>{match.publicClues.at(-1)?.title ?? model.patient.startingSymptom}</strong>
              </div>
              <aside className="event-card" aria-label="Shared event">
                <span aria-hidden="true">&#x2605;</span>
                <div><small>Plot twist</small><strong>{match.sharedEvent?.title ?? "Something weird is loading"}</strong><p>{match.sharedEvent?.description ?? "One friendly wobble will shake up this match."}</p></div>
              </aside>
            </article>

            <section id="clue-board" className="table-shared-clues" aria-labelledby="clue-title">
              <div className="table-section-title">
                <span aria-hidden="true">&#x2726;</span>
                <div><small>Everybody saw these</small><h2 id="clue-title">The public clue pile</h2></div>
                <b className="count-pill">{match.publicClues.length}</b>
              </div>
              <ClueList clues={match.publicClues} empty="Public oddities will pile up here." />
            </section>

            <section className="reveal-table table-reveal-zone" aria-labelledby="reveal-title" aria-live="polite">
            <div className="section-heading compact-heading">
              <div>
                <p className="playful-kicker">Center-stage nonsense</p>
                <h2 id="reveal-title">The dramatic card flip</h2>
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
                <span aria-hidden="true">&#x21bb;</span>
                <p>Locked cards make their grand entrance here.</p>
              </div>
            )}
          </section>
          </div>
        </section>

        <section id="player-hand" className="hand-dock" aria-labelledby="hand-title">
          <div className="private-clue-zone player-private-clues" aria-labelledby="private-clue-title">
            <div><h3 id="private-clue-title">Your secret evidence stash</h3><span>For your eyeballs only</span></div>
            <ClueList clues={match.privateClues} empty="Your secret stash is suspiciously empty." />
          </div>
          <div className="hand-heading">
            <div>
              <p className="playful-kicker">Round {match.round}</p>
              <h2 id="hand-title">Choose your trouble</h2>
              <p>{match.statusMessage}</p>
            </div>
            <div className="hand-tools">
              <button
                className="button button-small"
                disabled={!match.redrawAvailable || match.phase !== "card_selection"}
                onClick={actions.useRedraw}
              >
                Fresh hand, please
                <small>{match.redrawAvailable ? "1 free" : "Used"}</small>
              </button>
            </div>
          </div>
          {match.diagnosisBlockedUntilNextRound && (
            <p className="round-lock-note" role="status">
              That diagnosis tripped over its own shoelaces. Try again next round.
            </p>
          )}
          {match.humanHasDiagnosed ? (
            <div className="spectator-card">
              <span aria-hidden="true">&#x2713;</span>
              <div>
                <strong>Your diagnosis has left the building.</strong>
                <p>Stay for the remaining oddities and the dramatic unmasking.</p>
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
          {(match.canLock || match.canReveal) && <div className="match-actions">
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
          </div>}
          {(match.canAdvance || match.mustDiagnose) && (
            <section className="round-decision" aria-labelledby="round-decision-title">
              <div>
                <p className="playful-kicker">Decision o'clock</p>
                <h3 id="round-decision-title">The clues have stopped yelling</h3>
                <p>{roundDecisionMessage}</p>
              </div>
              <div className="round-decision-actions">
                {match.diagnosisUnlocked && !match.humanHasDiagnosed && (
                  <button
                    className="button button-diagnose button-large"
                    onClick={() => setDiagnosisOpen(true)}
                  >
                    Diagnose now
                  </button>
                )}
                {!match.mustDiagnose && (
                  <button
                    className={`button button-large ${match.diagnosisUnlocked ? "button-cream" : "button-primary"}`}
                    onClick={actions.advanceRound}
                  >
                    {match.round === match.maximumRounds ? "Finish Match" : "Keep investigating"}
                  </button>
                )}
              </div>
            </section>
          )}
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
  const visibilityLabel = card.visibility === "public" ? "Shared clue" : "Private clue";
  const label = `${categoryLabels[card.category]} card: ${card.title}. ${visibilityLabel}. ${card.description}${card.selected ? ". Selected" : ""}${card.locked ? ". Locked" : ""}`;
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
      <span className="card-art" aria-hidden="true">
        {card.icon ?? categoryIcons[card.category]}
      </span>
      <span className="card-copy">
        <strong>{card.title}</strong>
        <span>{card.description}</span>
      </span>
      <span className={`card-visibility visibility-${card.visibility}`}>
        <span aria-hidden="true">{card.visibility === "public" ? "\u25ce" : "\u25c9"}</span>
        {visibilityLabel}
      </span>
      {card.beginnerHint && <small>{card.beginnerHint}</small>}
      {card.locked && <span className="locked-badge">Locked</span>}
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
          &times;
        </button>
        <p className="playful-kicker">Put on your serious face</p>
        <h2 id="diagnosis-title" ref={titleRef} tabIndex={-1}>
          What is causing all this fuss?
        </h2>
        <p>
          Pick one condition and two clues that influenced you. You have{" "}
          <strong>{model.match.diagnosisAttemptsRemaining} attempt(s)</strong> remaining.
        </p>
        <p className="consequence-note">
          A wrong diagnosis costs 150 points. Your clues stay put, your dignity
          mostly survives, and you can keep investigating.
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
        <h1>The score goblins are counting&hellip;</h1>
      </main>
    );
  }
  const human = results.rankings.find((player) => player.isHuman);
  const firstPlaceCount = results.rankings.filter((player) => player.placement === 1).length;
  const humanOutcome = human
    ? human.placement === 1
      ? firstPlaceCount > 1
        ? "You shared first place."
        : "You won the room."
      : `You placed #${human.placement}.`
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
        <p className="playful-kicker">Case closed-ish</p>
        <h1 id="winner-title">{results.winnerName} rules the waiting room!</h1>
        <p>
          The culprit in sensible shoes was <strong>{results.hiddenDiagnosisName}</strong>.
        </p>
        {human && (
          <div className="human-result-summary">
            <p className={human.placement === 1 ? "human-outcome winner-outcome" : "human-outcome"}>
              <strong>{humanOutcome}</strong>
              <span>
                {human.diagnosisCorrect
                  ? `Your ${human.diagnosisName} diagnosis was correct.`
                  : "Your final diagnosis did not solve this case."}
              </span>
            </p>
            <div className="human-score">
              <span>Your detective points</span>
              <strong>{human.totalScore}</strong>
              <small>/ 1,000 points</small>
            </div>
          </div>
        )}
      </section>
      <section className="ranking-panel" aria-labelledby="ranking-title">
        <div className="section-heading compact-heading">
          <div>
            <p className="playful-kicker">The dust has settled</p>
            <h2 id="ranking-title">Waiting-room leaderboard</h2>
          </div>
        </div>
        <p className="tie-break-note">
          The tie-break gremlin used: <strong>{results.tieBreakLabel}</strong>.
        </p>
        <div className="rank-list">
          {results.rankings.map((player) => (
            <article className={`rank-card${player.placement === 1 ? " rank-winner" : ""}`} key={player.playerId}>
              <span className="placement" aria-label={`Place ${player.placement}`}>
                {player.placement}
              </span>
              <div className="rank-name">
                <strong>{player.displayName}{player.isHuman ? " (you)" : ""}</strong>
                <span className={player.diagnosisCorrect ? "correct-label" : "incorrect-label"}>
                  {player.diagnosisName} &middot; {player.diagnosisCorrect ? "Correct" : "Not solved"}
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
          <p className="playful-kicker">Why the clues were not just being dramatic</p>
          <h2>The mystery, untangled</h2>
          <p>{results.explanation}</p>
          <p className="education-note">This explanation applies only to this authored fictional case.</p>
        </article>
        <article className="paths-card">
          <p className="playful-kicker">Every questionable decision</p>
          <h2>How everyone snooped</h2>
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
    <details className="score-details" open={player.isHuman}>
      <summary>Show the suspicious math</summary>
      <dl>
        <div><dt>Correct diagnosis</dt><dd>{score.correctDiagnosis}</dd></div>
        <div><dt>Supporting clues</dt><dd>{score.supportingClues}</dd></div>
        <div><dt>Timing</dt><dd>{score.timing}</dd></div>
        <div><dt>Efficient investigation</dt><dd>{score.efficiency}</dd></div>
        <div><dt>Achievement</dt><dd>{score.achievement}</dd></div>
        <div><dt>Wrong-attempt penalties</dt><dd>{score.wrongAttemptPenalties}</dd></div>
      </dl>
      {player.achievementName && <p className="achievement-chip">&#x2605; {player.achievementName}</p>}
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
        &larr; {backLabel}
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
        <img className="patient-portrait-image" src={publicAsset("patient-jordan-lee.webp")} alt="" />
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
          {compact && condition.learnMore && <p className="condition-description">{condition.learnMore}</p>}
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
