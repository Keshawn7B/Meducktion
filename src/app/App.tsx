import { useMemo, useState } from "react";
import { selectors } from "../game-engine";
import type {
  CaseCallSubmission,
  Confidence,
  DifferentialUpdate,
  GameCommand,
} from "../game-engine";
import type { EvidenceDirection } from "../case-content";
import { useGameSession } from "../hooks/useGameSession";
import "./app.css";

const disclaimer =
  "Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. Do not use it to make decisions about real patients.";
const title = (value: string) =>
  ["routine", "prompt", "urgent", "emergent"].includes(value)
    ? value
    : value.replaceAll(/[-_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function App() {
  const game = useGameSession();
  if (!game.session)
    return (
      <Landing
        onStart={game.startNew}
        onResume={game.resume}
        canResume={game.resumeAvailable}
        {...(game.error ? { error: game.error.message } : {})}
      />
    );
  if (game.state?.phase === "case_intro") return <Intro game={game} />;
  if (game.state?.phase === "case_complete") return <Final game={game} />;
  return <Game game={game} />;
}
type GameHook = ReturnType<typeof useGameSession>;

function Disclaimer() {
  return (
    <p className="disclaimer">
      <strong>Fictional educational game.</strong> {disclaimer}
    </p>
  );
}
function Landing({
  onStart,
  onResume,
  canResume,
  error,
}: {
  onStart: () => void;
  onResume: () => void;
  canResume: boolean;
  error?: string;
}) {
  return (
    <main id="main" className="landing">
      <div className="signal-mark" aria-hidden="true">M</div>
      <p className="eyebrow">Medical mystery · solo prototype</p>
      <h1>
        Meducktion
      </h1>
      <p className="tagline">
        Read the evidence. Protect the patient. Call the case.
      </p>
      <div className="landing-actions">
        <button className="primary" onClick={onStart}>
          Start new case
        </button>
        {canResume && <button onClick={onResume}>Resume case</button>}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p>One authored prototype case is included.</p>
      <Disclaimer />
    </main>
  );
}
function Intro({ game }: { game: GameHook }) {
  const d = game.caseDefinition,
    s = game.state;
  return (
    <main id="main" className="intro shell">
      <header>
        <p className="eyebrow">Case 01 · Guided assessment</p>
        <h1>{d.metadata.title}</h1>
      </header>
      <section className="intro-grid">
        <div
          className="portrait"
          aria-label="Stylized signal portrait of Jordan Lee"
        >
          <div className="portrait-head" />
          <div className="pulse">⌁</div>
        </div>
        <div>
          <h2>{d.patient.displayName}</h2>
          <p className="lead">
            Age {d.patient.age} · {d.patient.chiefComplaint}
          </p>
          <div className="stats">
            <Stat label="Starting stability" value={`${s?.stability}/100`} />
            <Stat
              label="Care intervals"
              value={String(d.mode.maximumCareIntervals)}
            />
            <Stat
              label="Care Budget"
              value={String(d.mode.startingCareBudget)}
            />
            <Stat
              label="Focus / interval"
              value={String(d.mode.focusPerPlayerPerInterval)}
            />
          </div>
          <h3>Initial findings</h3>
          <ul>
            {d.clues
              .filter((c) => c.initiallyVisible)
              .map((c) => (
                <li key={c.id}>{c.displayText}</li>
              ))}
          </ul>
          <p className="guided">
            Guided mode explains evidence strength, safety signals, and
            tradeoffs without revealing the answer.
          </p>
          <button
            className="primary"
            onClick={() => game.dispatch({ type: "START_CASE" })}
          >
            Begin assessment
          </button>
        </div>
      </section>
      <Disclaimer />
    </main>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Game({ game }: { game: GameHook }) {
  const s = game.state!;
  const d = game.caseDefinition;
  const [tab, setTab] = useState("evidence");
  const [callOpen, setCallOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const recent = game.latestEvents;
  const phaseActions: Partial<
    Record<typeof s.phase, { label: string; command: GameCommand }>
  > = {
    planning: { label: "Lock actions", command: { type: "LOCK_ACTIONS" } },
    actions_locked: {
      label: "Resolve interval",
      command: { type: "RESOLVE_INTERVAL" },
    },
    results_reveal: {
      label: "Review complete",
      command: { type: "ACKNOWLEDGE_RESULTS" },
    },
    decision: {
      label: "Continue to next interval",
      command: { type: "CONTINUE_TO_NEXT_INTERVAL" },
    },
  };
  const control = phaseActions[s.phase];
  return (
    <>
      <a className="skip" href="#main">
        Skip to game
      </a>
      <header className="topbar">
        <div>
          <strong>
            Meducktion
          </strong>
          <small>{d.metadata.title}</small>
        </div>
        <div className="top-metrics">
          <span>
            Interval{" "}
            <b>
              {s.careInterval}/{s.maximumCareIntervals}
            </b>
          </span>
          <span>
            Focus{" "}
            <b>
              {selectors.provisionalFocus(d, s)}/
              {d.mode.focusPerPlayerPerInterval}
            </b>
          </span>
          <span>
            Budget{" "}
            <b>
              {selectors.provisionalBudget(d, s)}/{d.mode.startingCareBudget}
            </b>
          </span>
          <span className={`status ${selectors.stabilityLabel(s)}`}>
            {s.stability} · {title(selectors.stabilityLabel(s))}
          </span>
        </div>
      </header>
      <nav className="mobile-tabs" aria-label="Game views">
        {["patient", "evidence", "differential", "actions"].map((x) => (
          <button key={x} aria-pressed={tab === x} onClick={() => setTab(x)}>
            {title(x)}
          </button>
        ))}
      </nav>
      <main id="main" className="game-grid">
        <aside
          className={`panel patient-panel ${tab !== "patient" ? "mobile-hidden" : ""}`}
        >
          <Patient game={game} />
        </aside>
        <section
          className={`panel evidence-panel ${tab !== "evidence" ? "mobile-hidden" : ""}`}
        >
          <Phase game={game} />
          {s.phase === "results_reveal" && <TransitionSummary game={game} />}
          <Evidence game={game} />
        </section>
        <aside className="side-stack">
          <section
            className={`panel ${tab !== "actions" ? "mobile-hidden" : ""}`}
          >
            <Resources game={game} />
            <TestQueue game={game} />
            <Actions game={game} />
            {control && !(s.phase === "decision" && s.escalated) && (
              <button
                className="primary wide"
                onClick={() => game.dispatch(control.command)}
              >
                {control.label}
              </button>
            )}
            {s.phase === "decision" && (
              <>
                <button
                  className="primary wide"
                  onClick={() => setCallOpen(true)}
                >
                  Call the case
                </button>
                {s.escalated && (
                  <button
                    className="wide"
                    onClick={() =>
                      game.dispatch({ type: "COMPLETE_ESCALATED_UNRESOLVED" })
                    }
                  >
                    Finish safely without diagnosis
                  </button>
                )}
              </>
            )}
          </section>
          <section
            className={`panel ${tab !== "differential" ? "mobile-hidden" : ""}`}
          >
            <Differential game={game} />
          </section>
        </aside>
      </main>
      {game.error && (
        <div className="error toast" role="alert" aria-live="assertive">
          {game.error.message}
          <small>{game.error.details}</small>
        </div>
      )}
      <section className="event-drawer">
        <button aria-expanded={logOpen} onClick={() => setLogOpen(!logOpen)}>
          Event history ({s.eventLog.length})
        </button>
        {logOpen && (
          <ol>
            {s.eventLog.map((e) => (
              <li key={e.sequence}>
                <b>
                  #{e.sequence} · I{e.careInterval}
                </b>{" "}
                {title(e.type)} <code>{e.relatedIds.join(", ")}</code>
                <details>
                  <summary>Payload</summary>
                  <pre>{JSON.stringify(e.payload, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
      {callOpen && <CaseCall game={game} close={() => setCallOpen(false)} />}
    </>
  );
}

function Patient({ game }: { game: GameHook }) {
  const s = game.state!,
    d = game.caseDefinition;
  const changes = s.eventLog
    .filter((e) => e.type === "stability_changed")
    .slice(-2);
  return (
    <>
      <div className="mini-portrait">
        <div />
      </div>
      <p className="eyebrow">Patient signal</p>
      <h2>{d.patient.displayName}</h2>
      <p>
        Age {d.patient.age} · {d.patient.chiefComplaint}
      </p>
      <div
        className="stability"
        aria-label={`Stability ${s.stability}, ${selectors.stabilityLabel(s)}`}
      >
        <strong>{s.stability}</strong>
        <span>{title(selectors.stabilityLabel(s))}</span>
        <div style={{ width: `${s.stability}%` }} />
      </div>
      <dl>
        <dt>Phase</dt>
        <dd>{title(s.phase)}</dd>
        <dt>Interval</dt>
        <dd>
          {s.careInterval} of {s.maximumCareIntervals}
        </dd>
        <dt>Escalated</dt>
        <dd>{s.escalated ? "Yes" : "No"}</dd>
      </dl>
      {changes.map((e) => (
        <p className="change" key={e.sequence}>
          {String(e.payload.previous)} → {String(e.payload.next)} (
          {Number(e.payload.delta) > 0 ? "+" : ""}
          {String(e.payload.delta)}) · {title(String(e.payload.source))}
        </p>
      ))}
      <h3>Active warnings</h3>
      {s.revealedWarningIds.length ? (
        <ul>
          {s.revealedWarningIds.map((id) => (
            <li key={id}>
              {
                game.caseDefinition.progression.warnings.find(
                  (w) => w.id === id,
                )?.displayText
              }
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No active warnings.</p>
      )}
    </>
  );
}
function Phase({ game }: { game: GameHook }) {
  const s = game.state!;
  return (
    <header className="phase">
      <div>
        <p className="eyebrow">Care Interval {s.careInterval}</p>
        <h2>{title(s.phase)}</h2>
      </div>
      <span>
        {game.caseDefinition.mode.caseCallAttemptLimit - s.caseCallAttemptsUsed}{" "}
        Case Call attempt(s)
      </span>
    </header>
  );
}
function Resources({ game }: { game: GameHook }) {
  const s = game.state!,
    d = game.caseDefinition;
  return (
    <div className="resource-grid">
      <Stat
        label="Focus left"
        value={`${selectors.provisionalFocus(d, s)}/${d.mode.focusPerPlayerPerInterval}`}
      />
      <Stat
        label="Selected Focus"
        value={String(selectors.selectedFocus(d, s))}
      />
      <Stat
        label="Budget left"
        value={`${selectors.provisionalBudget(d, s)}/${d.mode.startingCareBudget}`}
      />
      <Stat label="Budget spent" value={String(s.careBudgetSpent)} />
      <Stat
        label="Test slots left"
        value={`${selectors.pendingMajorSlots(d, s)}/${d.mode.maximumPendingMajorTests}`}
      />
    </div>
  );
}
function TestQueue({ game }: { game: GameHook }) {
  const s = game.state!,
    d = game.caseDefinition;
  return (
    <div>
      <h3>Pending tests</h3>
      {s.pendingTests.length ? (
        s.pendingTests.map((t) => {
          const a = d.actions.find((x) => x.id === t.actionId);
          return (
            <div className="pending" key={t.id}>
              <strong>{a?.displayName}</strong>
              <span>
                Ordered I{t.orderedInterval} · {t.remainingDelay} interval(s)
                remaining ·{" "}
                {a && a.category === "test" ? a.patientBurden : "low"} burden
              </span>
            </div>
          );
        })
      ) : (
        <p className="muted">No tests pending.</p>
      )}
    </div>
  );
}
function Actions({ game }: { game: GameHook }) {
  const s = game.state!,
    d = game.caseDefinition;
  const groups = [
    "interview",
    "examination",
    "monitoring",
    "test",
    "treatment",
    "escalation",
  ] as const;
  return (
    <div>
      <h2>Action tray</h2>
      {groups.map((g) => (
        <div key={g}>
          <h3>{g === "escalation" ? "Treatment and safety" : title(g)}</h3>
          <div className="action-list">
            {d.actions
              .filter((a) => a.category === g)
              .map((a) => {
                const selected = s.selectedActions.some(
                  (x) => x.actionId === a.id,
                );
                const completed =
                  s.completedActionIds.includes(a.id) &&
                  a.repeatRule.type === "never";
                const disabled = s.phase !== "planning" || completed;
                return (
                  <button
                    key={a.id}
                    className={`action-card ${selected ? "selected" : ""}`}
                    disabled={disabled}
                    title={
                      disabled
                        ? completed
                          ? "Already completed"
                          : "Available during planning only"
                        : a.guidedHint.short
                    }
                    onClick={() =>
                      game.dispatch({
                        type: selected ? "DESELECT_ACTION" : "SELECT_ACTION",
                        actionId: a.id,
                      })
                    }
                  >
                    <span>
                      <strong>{a.displayName}</strong>
                      <small>{a.guidedHint.short}</small>
                    </span>
                    <span className="cost">
                      {a.focusCost}F · {a.careBudgetCost}B
                      {a.category === "test"
                        ? ` · delay ${a.delayCareIntervals}`
                        : ""}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
function Evidence({ game }: { game: GameHook }) {
  const s = game.state!,
    d = game.caseDefinition;
  return (
    <>
      <h2>Evidence Board</h2>
      <div className="evidence-grid">
        {s.revealedClues.map((r) => {
          const c = d.clues.find((x) => x.id === r.clueId);
          if (!c) return null;
          return (
            <article className={`evidence-card ${c.category}`} key={c.id}>
              <div>
                <span className="chip">{title(c.category)}</span>
                {c.redFlag.isRedFlag && (
                  <span className="chip danger">Red flag</span>
                )}
              </div>
              <h3>{c.displayText}</h3>
              <p>
                {title(c.strength)} strength · {title(c.reliability)}{" "}
                reliability · {title(c.timing)}
              </p>
              <small>{c.guidedExplanation.short}</small>
            </article>
          );
        })}
      </div>
    </>
  );
}
function TransitionSummary({ game }: { game: GameHook }) {
  return (
    <section className="reveal" aria-live="polite">
      <h2>Interval results</h2>
      {game.latestEvents.length ? (
        game.latestEvents
          .filter((e) =>
            [
              "clue_revealed",
              "test_completed",
              "stability_changed",
              "warning_triggered",
              "complication_triggered",
              "case_escalated",
            ].includes(e.type),
          )
          .map((e) => (
            <p key={e.sequence}>
              <b>{title(e.type)}:</b>{" "}
              {e.relatedIds.map((id) => labelFor(game, id)).join(", ") ||
                String(e.payload.next ?? "")}
            </p>
          ))
      ) : (
        <p>No new findings this interval.</p>
      )}
    </section>
  );
}
function labelFor(game: GameHook, id: string) {
  return (
    game.caseDefinition.actions.find((a) => a.id === id)?.displayName ??
    game.caseDefinition.clues.find((c) => c.id === id)?.displayText ??
    game.caseDefinition.diagnoses.find((d) => d.id === id)?.displayName ??
    title(id)
  );
}

function Differential({ game }: { game: GameHook }) {
  const [entries, setEntries] = useState<DifferentialUpdate[]>(() =>
    game.state!.differential.map(({ mustExclude: _, ...e }) => e),
  );
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= entries.length) return;
    const next = [...entries];
    const a = next[i],
      b = next[j];
    if (!a || !b) return;
    next[i] = { ...a, rank: j + 1 };
    next[j] = { ...b, rank: i + 1 };
    next.sort((x, y) => x.rank - y.rank);
    setEntries(next);
  };
  const assign = (di: number, clueId: string, direction: EvidenceDirection) =>
    setEntries(
      entries.map((e, i) =>
        i === di
          ? {
              ...e,
              evidence: [
                ...e.evidence.filter((x) => x.clueId !== clueId),
                { clueId, direction },
              ],
            }
          : e,
      ),
    );
  return (
    <>
      <h2>Shared differential</h2>
      {entries.map((e, i) => {
        const diagnosis = game.caseDefinition.diagnoses.find(
          (d) => d.id === e.diagnosisId,
        );
        return (
          <article className="diagnosis" key={e.diagnosisId}>
            <div>
              <b>
                #{e.rank} {diagnosis?.displayName}
              </b>
              {diagnosis?.mustExclude && (
                <span className="chip danger">Must Exclude</span>
              )}
            </div>
            <div className="row">
              <button
                aria-label={`Move ${diagnosis?.displayName} up`}
                onClick={() => move(i, -1)}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                aria-label={`Move ${diagnosis?.displayName} down`}
                onClick={() => move(i, 1)}
                disabled={i === entries.length - 1}
              >
                ↓
              </button>
              <select
                aria-label={`Confidence for ${diagnosis?.displayName}`}
                value={e.confidence}
                onChange={(x) =>
                  setEntries(
                    entries.map((v, j) =>
                      j === i
                        ? { ...v, confidence: x.target.value as Confidence }
                        : v,
                    ),
                  )
                }
              >
                {[
                  "unlikely",
                  "possible",
                  "plausible",
                  "leading",
                  "highlySupported",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <details>
              <summary>Assign revealed evidence</summary>
              {game.state!.revealedClues.map((r) => (
                <div className="assign" key={r.clueId}>
                  <span>{labelFor(game, r.clueId)}</span>
                  {(["supports", "conflicts", "unresolved"] as const).map(
                    (x) => (
                      <button key={x} onClick={() => assign(i, r.clueId, x)}>
                        {title(x)}
                      </button>
                    ),
                  )}
                </div>
              ))}
            </details>
          </article>
        );
      })}
      <button
        className="wide"
        onClick={() => game.dispatch({ type: "UPDATE_DIFFERENTIAL", entries })}
      >
        Save differential
      </button>
    </>
  );
}

function CaseCall({ game, close }: { game: GameHook; close: () => void }) {
  const d = game.caseDefinition,
    s = game.state!;
  const [diagnosisId, setDiagnosis] = useState("");
  const [urgency, setUrgency] = useState("");
  const [nextStepId, setStep] = useState("");
  const [support, setSupport] = useState<string[]>([]);
  const [alt, setAlt] = useState("");
  const [weak, setWeak] = useState("");
  const [confirm, setConfirm] = useState(false);
  const submit = () =>
    game.dispatch({
      type: "SUBMIT_CASE_CALL",
      caseCall: {
        diagnosisId,
        urgency: urgency as CaseCallSubmission["urgency"],
        nextStepId,
        supportingClueIds: support,
        alternativeDiagnosisId: alt,
        alternativeWeakeningClueId: weak,
      },
    });
  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <button type="button" className="close" onClick={close}>
          Close
        </button>
        <p className="eyebrow">
          {d.mode.caseCallAttemptLimit - s.caseCallAttemptsUsed} attempt(s)
          remaining
        </p>
        <h2 id="call-title">Call the case</h2>
        <p>
          An incorrect complete call consumes an attempt and may advance the
          patient.
        </p>
        <label>
          Most likely diagnosis
          <select
            value={diagnosisId}
            onChange={(e) => setDiagnosis(e.target.value)}
            required
          >
            <option value="">Choose…</option>
            {d.diagnoses.map((x) => (
              <option value={x.id} key={x.id}>
                {x.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Urgency
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            required
          >
            <option value="">Choose…</option>
            {[...new Set(d.nextSteps.map((x) => x.urgency))].map((x) => (
              <option key={x}>{title(x)}</option>
            ))}
          </select>
        </label>
        <label>
          Safest next step
          <select
            value={nextStepId}
            onChange={(e) => setStep(e.target.value)}
            required
          >
            <option value="">Choose…</option>
            {d.nextSteps.map((x) => (
              <option value={x.id} key={x.id}>
                {x.displayName}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Supporting evidence (choose at least two)</legend>
          {s.revealedClues.map((r) => (
            <label className="check" key={r.clueId}>
              <input
                type="checkbox"
                checked={support.includes(r.clueId)}
                onChange={(e) =>
                  setSupport(
                    e.target.checked
                      ? [...support, r.clueId]
                      : support.filter((x) => x !== r.clueId),
                  )
                }
              />
              {labelFor(game, r.clueId)}
            </label>
          ))}
        </fieldset>
        <label>
          Major alternative
          <select value={alt} onChange={(e) => setAlt(e.target.value)} required>
            <option value="">Choose…</option>
            {d.diagnoses
              .filter((x) => x.id !== diagnosisId)
              .map((x) => (
                <option value={x.id} key={x.id}>
                  {x.displayName}
                </option>
              ))}
          </select>
        </label>
        <label>
          Why it is less likely
          <select
            value={weak}
            onChange={(e) => setWeak(e.target.value)}
            required
          >
            <option value="">Choose revealed evidence…</option>
            {s.revealedClues.map((r) => (
              <option value={r.clueId} key={r.clueId}>
                {labelFor(game, r.clueId)}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
          />
          I am ready to submit this Case Call.
        </label>
        <button className="primary wide" disabled={!confirm}>
          Submit Case Call
        </button>
        {game.error && (
          <p className="error" role="alert">
            {game.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

function Final({ game }: { game: GameHook }) {
  const s = game.state!,
    score = s.score!,
    d = game.caseDefinition;
  return (
    <main id="main" className="results shell">
      <p className="eyebrow">Case complete</p>
      <h1>{title(s.outcome ?? "Case complete")}</h1>
      <div className="score">
        <strong>{score.total}</strong>
        <span>/ 1,000</span>
      </div>
      <div className="score-grid">
        {Object.entries(score)
          .filter(([k, v]) => typeof v === "number" && k !== "total")
          .map(([k, v]) => (
            <Stat key={k} label={title(k)} value={String(v)} />
          ))}
      </div>
      {score.penalties.length > 0 && (
        <>
          <h2>Penalties</h2>
          <ul>
            {score.penalties.map((p) => (
              <li key={p.id}>
                {title(p.id)}: {p.points}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="final-facts">
        <Stat label="Final stability" value={String(s.stability)} />
        <Stat label="Intervals used" value={String(s.careInterval)} />
        <Stat
          label="Tests ordered"
          value={String(
            d.actions.filter(
              (a) =>
                a.category === "test" && s.completedActionIds.includes(a.id),
            ).length,
          )}
        />
        <Stat label="Budget spent" value={String(s.careBudgetSpent)} />
        <Stat
          label="Case Call attempts"
          value={String(s.caseCallAttemptsUsed)}
        />
      </div>
      <h2>Case debrief</h2>
      <p>
        <b>Diagnosis:</b>{" "}
        {
          d.diagnoses.find((x) => x.id === d.finalAnswer.diagnosisId)
            ?.displayName
        }
      </p>
      <p>
        <b>Urgency:</b> {title(d.finalAnswer.urgency)}
      </p>
      <p>
        <b>Next step:</b>{" "}
        {
          d.nextSteps.find((x) => x.id === d.finalAnswer.nextStepId)
            ?.displayName
        }
      </p>
      <p>
        This authored scenario rewards combining the evolving pain pattern with
        focused findings while protecting patient stability. Findings are
        simplified and fictional.
      </p>
      <button className="primary" onClick={game.reset}>
        Play again
      </button>
      <Disclaimer />
    </main>
  );
}
