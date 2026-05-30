import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { DIFF_SECS, DIFF_LABEL, SUBJECT_META, REAL_MOCK_SUBJECTS } from "./constants";
import { fmt, ringColor, useInterval, playTick } from "./utils";
import { Label, SR, Toggle, SectionTitle, Insight } from "./components";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUBJECT HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function subjCol(C, name) {
  if (name === "physics")   return C.blue;
  if (name === "chemistry") return C.green;
  if (name === "maths")     return C.purple;
  return C.sub;
}

const SUBJ_RGBA = {
  physics:   "77,143,255",
  chemistry: "74,222,128",
  maths:     "167,139,250",
};

// Fixed canonical section order for sectional mock
const SECTION_ORDER = ["chemistry", "physics", "maths"];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK SUBJECT NAVIGATION BAR
// Rendered at top of SessionScreen for mock sessions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function MockSubjectNav({ C, session, navType, onSwitch }) {
  const activeSubj = session.qs[session.cur]?.subject;

  // For sectional: derive the currently unlocked section
  const sectionalActive = SECTION_ORDER.find(subj =>
    session.qs.some(q => q.subject === subj && q.status !== "done")
  ) ?? SECTION_ORDER[SECTION_ORDER.length - 1];

  return (
    <div style={{
      display: "flex", gap: 8, marginBottom: 20,
      background: "transparent",
    }}>
      {SECTION_ORDER.map(subj => {
        const meta       = SUBJECT_META[subj];
        const col        = subjCol(C, subj);
        const rgba       = SUBJ_RGBA[subj];
        const subjQs     = session.qs.filter(q => q.subject === subj);
        const doneCount  = subjQs.filter(q => q.status === "done").length;
        const total      = subjQs.length;
        const pct        = total > 0 ? doneCount / total : 0;
        const isActive   = subj === activeSubj;
        const isComplete = doneCount === total && total > 0;

        // Sectional: only the current unlocked section is "live"; others are locked
        const isSectionalLocked = navType === "sectional" && subj !== sectionalActive;
        // Open: all tabs are clickable (except currently active)
        const isClickable = navType === "open" && !isActive;

        return (
          <button key={subj} className="btn"
            onClick={() => isClickable && onSwitch(subj)}
            style={{
              flex: 1, padding: "10px 10px 8px", borderRadius: 12,
              display: "flex", flexDirection: "column", gap: 5,
              background: isActive
                ? `rgba(${rgba},.13)`
                : isComplete ? `rgba(${rgba},.06)` : C.card,
              border: isActive
                ? `1.5px solid rgba(${rgba},.55)`
                : isComplete ? `1px solid rgba(${rgba},.25)` : `1px solid ${C.border}`,
              cursor: isClickable ? "pointer" : "default",
              opacity: isSectionalLocked ? 0.42 : 1,
              transition: "all .22s",
              position: "relative",
            }}>

            {/* Header row: short name + lock/check */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: .6,
                color: isActive ? col : isComplete ? col : C.sub,
              }}>{meta.short}</span>
              {isComplete && !isActive && (
                <span style={{ fontSize: 10, color: col }}>✓</span>
              )}
              {isSectionalLocked && !isComplete && (
                <span style={{ fontSize: 9, color: C.muted }}>🔒</span>
              )}
            </div>

            {/* Done / Total count */}
            <div style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13, fontWeight: 700,
              color: isActive ? col : isComplete ? col : C.muted,
            }}>
              {doneCount}<span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>/{total}</span>
            </div>

            {/* Mini progress bar */}
            <div style={{
              height: 3, background: C.border, borderRadius: 2, overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${pct * 100}%`,
                background: col,
                borderRadius: 2,
                transition: "width .45s ease",
              }}/>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETUP SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function SetupScreen({ C, onStart }) {
  // ── Study session state (unchanged) ──
  const [mode,     setMode]     = useState("equal");
  const [totalMin, setTotalMin] = useState(60);
  const [numQ,     setNumQ]     = useState(20);
  const [tickOn,   setTickOn]   = useState(false);
  const [easyQ,    setEasyQ]    = useState(5);
  const [medQ,     setMedQ]     = useState(10);
  const [hardQ,    setHardQ]    = useState(5);

  // ── Session type + mock state ──
  const [sessionType, setSessionType] = useState("study");
  const [mockMode,    setMockMode]    = useState("real");
  const [navType,     setNavType]     = useState("sectional"); // "sectional" | "open"

  // Customize mock sliders
  const [phyQ,  setPhyQ]  = useState(25);
  const [phyT,  setPhyT]  = useState(2);
  const [chemQ, setChemQ] = useState(25);
  const [chemT, setChemT] = useState(1.5);
  const [mathQ, setMathQ] = useState(25);
  const [mathT, setMathT] = useState(3);

  // ── Study session derived values (unchanged) ──
  const adaptiveTotal = easyQ + medQ + hardQ;
  const adaptiveSecs  = easyQ * DIFF_SECS.easy + medQ * DIFF_SECS.medium + hardQ * DIFF_SECS.hard;
  const perQSecs      = mode !== "adaptive" ? Math.floor((totalMin * 60) / Math.max(1, numQ)) : 0;

  // ── Mock derived values ──
  const mockSubjects = mockMode === "real"
    ? REAL_MOCK_SUBJECTS
    : [
        { name: "physics",   q: phyQ,  minPerQ: phyT  },
        { name: "chemistry", q: chemQ, minPerQ: chemT },
        { name: "maths",     q: mathQ, minPerQ: mathT },
      ];
  const totalMockQ    = mockSubjects.reduce((a, s) => a + s.q, 0);
  const totalMockSecs = mockSubjects.reduce((a, s) => a + s.q * s.minPerQ * 60, 0);

  // ── Start handlers ──
  const handleStudyStart = () => {
    if (mode === "adaptive") {
      if (adaptiveTotal === 0) return;
      const diffs = [
        ...Array(easyQ).fill("easy"),
        ...Array(medQ).fill("medium"),
        ...Array(hardQ).fill("hard"),
      ];
      onStart({ sessionType: "study", mode, diffs, numQ: adaptiveTotal, totalMin: Math.ceil(adaptiveSecs / 60), tick: false });
    } else {
      if (numQ === 0 || totalMin === 0) return;
      onStart({ sessionType: "study", mode, numQ, totalMin, diffs: Array(numQ).fill("medium"), tick: mode === "pressure" && tickOn });
    }
  };

  const handleMockStart = () => {
    if (totalMockQ === 0) return;
    onStart({
      sessionType: "mock",
      mockMode,
      navType,
      subjects: mockSubjects,
      mode: "equal",
      tick: false,
    });
  };

  const handleStart = sessionType === "mock" ? handleMockStart : handleStudyStart;

  const modeBtn = (m, label, icon) => (
    <button key={m} className="btn" onClick={() => setMode(m)} style={{
      flex: 1, padding: "10px 6px", borderRadius: 9, fontSize: 13, fontWeight: 600,
      letterSpacing: .4, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      background: mode === m ? C.accent : "transparent",
      color: mode === m ? "#050a10" : C.sub,
      border: mode === m ? "none" : `1px solid ${C.border}`,
      transition: "all .2s",
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ paddingTop: 44, paddingBottom: 60 }}>
      {/* Header */}
      <div className="fi" style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -.5, marginBottom: 6 }}>
          Configure Session
        </h1>
        <p style={{ color: C.sub, fontSize: 14 }}>
          {sessionType === "study"
            ? "Set your targets. Train your temperament."
            : "Simulate the real exam. Test your readiness."}
        </p>
      </div>

      {/* Session type toggle */}
      <div className="fi" style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-flex", background: C.card,
          borderRadius: 14, padding: 4, border: `1px solid ${C.border}`, gap: 4,
        }}>
          {[["study", "📚 Study Session"], ["mock", "📝 Mock Session"]].map(([type, label]) => (
            <button key={type} className="btn" onClick={() => setSessionType(type)} style={{
              padding: "10px 28px", borderRadius: 11, fontSize: 13, fontWeight: 600,
              letterSpacing: .3, border: "none", transition: "all .22s",
              background: sessionType === type
                ? (type === "mock"
                    ? `linear-gradient(135deg, ${C.purple}, ${C.blue})`
                    : `linear-gradient(135deg, ${C.accent}, ${C.blue})`)
                : "transparent",
              color: sessionType === type ? "#050a10" : C.sub,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          STUDY SESSION PANEL (existing — untouched)
          ══════════════════════════════════════════════ */}
      {sessionType === "study" && (
        <div className="setup-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, maxWidth: 780, margin: "0 auto",
        }}>
          <div className="fi2" style={{
            background: C.surface, borderRadius: 18, padding: 26,
            border: `1px solid ${C.border}`, boxShadow: `0 6px 32px ${C.sh}`,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: C.muted, marginBottom: 18, textTransform: "uppercase" }}>
              Session Mode
            </div>
            <div className="mode-tabs" style={{
              display: "flex", gap: 8, marginBottom: 28,
              background: C.card, borderRadius: 12, padding: 5,
            }}>
              {modeBtn("equal",    "Equal",    "⚡")}
              {modeBtn("adaptive", "Adaptive", "🎯")}
              {modeBtn("pressure", "Pressure", "🔥")}
            </div>
            {mode !== "adaptive" ? (
              <>
                <Label C={C} label="Total Duration" val={`${totalMin} min`} col={C.accent}/>
                <input type="range" min={10} max={180} step={5}
                  value={totalMin} onChange={e => setTotalMin(+e.target.value)}
                  style={{ marginBottom: 20 }}/>
                <Label C={C} label="Number of Questions" val={numQ} col={C.blue}/>
                <input type="range" min={1} max={60} step={1}
                  value={numQ} onChange={e => setNumQ(+e.target.value)}
                  style={{ marginBottom: 20 }}/>
                {mode === "pressure" && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: 10, marginTop: 4,
                    background: "rgba(248,113,113,.06)", border: `1px solid rgba(248,113,113,.18)`,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>Ticking Sound</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Last 10 seconds per question</div>
                    </div>
                    <Toggle on={tickOn} setOn={setTickOn} col={C.red}/>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 18, lineHeight: 1.6 }}>
                  Each difficulty level has a preset time allocation. Adjust question counts below.
                </div>
                {[
                  ["easy",   "Easy",   C.green,  "5:00 / q"],
                  ["medium", "Medium", C.yellow, "8:00 / q"],
                  ["hard",   "Hard",   C.red,    "12:00 / q"],
                ].map(([key, lbl, col, timeStr]) => {
                  const val = key === "easy" ? easyQ : key === "medium" ? medQ : hardQ;
                  const set = key === "easy" ? setEasyQ : key === "medium" ? setMedQ : setHardQ;
                  return (
                    <div key={key} style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, display: "inline-block" }}/>
                          <span style={{ fontSize: 13, color: C.sub }}>{lbl}</span>
                          <span style={{ fontSize: 10, color: C.muted }}>{timeStr}</span>
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: col }}>{val}</span>
                      </div>
                      <input type="range" min={0} max={30} step={1}
                        value={val} onChange={e => set(+e.target.value)}/>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="fi3" style={{
              background: C.surface, borderRadius: 18, padding: 22,
              border: `1px solid ${C.border}`, boxShadow: `0 6px 32px ${C.sh}`, flex: 1,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: C.muted, marginBottom: 18, textTransform: "uppercase" }}>
                Session Preview
              </div>
              {mode !== "adaptive" ? (
                <>
                  <SR C={C} label="Total Time"  val={`${totalMin} min`}  col={C.accent}/>
                  <SR C={C} label="Questions"   val={numQ}               col={C.blue}/>
                  <SR C={C} label="Time / Q"    val={fmt(perQSecs)}      col={C.purple}/>
                  <SR C={C} label="Mode"        val={mode.toUpperCase()} col={mode === "pressure" ? C.red : C.green}/>
                </>
              ) : (
                <>
                  <SR C={C} label="Easy × 5:00"  val={`${easyQ} questions`} col={C.green}/>
                  <SR C={C} label="Med × 8:00"   val={`${medQ} questions`}  col={C.yellow}/>
                  <SR C={C} label="Hard × 12:00" val={`${hardQ} questions`} col={C.red}/>
                  <div style={{ height: 1, background: C.border, margin: "10px 0" }}/>
                  <SR C={C} label="Total Q"    val={adaptiveTotal}                        col={C.accent}/>
                  <SR C={C} label="Total Time" val={`~${Math.ceil(adaptiveSecs / 60)} min`} col={C.blue}/>
                </>
              )}
            </div>
            <div style={{ background: C.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}`, fontSize: 12, color: C.sub, lineHeight: 1.75 }}>
              {mode === "equal"    && "⚡ Equal time per question. Classic simulation. Build consistent pacing habits."}
              {mode === "adaptive" && "🎯 Difficulty-weighted timing. Harder questions get more runway. Closest to real JEE."}
              {mode === "pressure" && "🔥 No pause. No safety net. Pure exam temperament training. Use this to test your real limits."}
            </div>
            <div style={{ background: C.card, borderRadius: 12, padding: "10px 14px", border: `1px solid ${C.border}`, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>SHORTCUTS</span>
              {[["Space", "Pause"], ["Enter", "Done"], ["N", "Notes"]].map(([k, l]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <kbd style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 7px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: C.accent }}>{k}</kbd>
                  <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MOCK SESSION PANEL
          ══════════════════════════════════════════════ */}
      {sessionType === "mock" && (
        <div className="setup-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, maxWidth: 780, margin: "0 auto",
        }}>
          {/* ── Left: Mock Config ── */}
          <div className="fi2" style={{
            background: C.surface, borderRadius: 18, padding: 26,
            border: `1px solid ${C.border}`, boxShadow: `0 6px 32px ${C.sh}`,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: C.muted, marginBottom: 16, textTransform: "uppercase" }}>
              Mock Mode
            </div>

            {/* Real / Customize toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18, background: C.card, borderRadius: 12, padding: 5 }}>
              {[["real", "🎓 Real Mock"], ["customize", "⚙ Customize"]].map(([m, lbl]) => (
                <button key={m} className="btn" onClick={() => setMockMode(m)} style={{
                  flex: 1, padding: "9px 6px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                  background: mockMode === m ? C.purple : "transparent",
                  color: mockMode === m ? "#050a10" : C.sub,
                  border: mockMode === m ? "none" : `1px solid ${C.border}`,
                  transition: "all .2s",
                }}>{lbl}</button>
              ))}
            </div>

            {/* ── Navigation Type toggle ── */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>
                Navigation Type
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  ["sectional", "📋 Sectional", "Fixed order: CHE → PHY → MTH"],
                  ["open",      "🔀 Open",       "Switch subjects freely anytime"],
                ].map(([nt, lbl, desc]) => (
                  <button key={nt} className="btn" onClick={() => setNavType(nt)} style={{
                    flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "left",
                    background: navType === nt ? `rgba(77,143,255,.1)` : "transparent",
                    border: navType === nt ? `1.5px solid ${C.blue}` : `1px solid ${C.border}`,
                    transition: "all .2s", cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: navType === nt ? C.blue : C.sub, marginBottom: 3 }}>{lbl}</div>
                    <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.4 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Real Mock locked rows */}
            {mockMode === "real" && (
              <>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "3px 10px", borderRadius: 20, marginBottom: 14,
                  background: `rgba(${SUBJ_RGBA.maths},.1)`,
                  border: `1px solid rgba(${SUBJ_RGBA.maths},.25)`,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: C.purple, textTransform: "uppercase" }}>
                    JEE Standard Pacing
                  </span>
                </div>
                {REAL_MOCK_SUBJECTS.map(subj => {
                  const meta = SUBJECT_META[subj.name];
                  const col  = subjCol(C, subj.name);
                  return (
                    <div key={subj.name} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "11px 14px", borderRadius: 10, marginBottom: 10,
                      background: `rgba(${SUBJ_RGBA[subj.name]},.05)`,
                      border: `1px solid rgba(${SUBJ_RGBA[subj.name]},.15)`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }}/>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{meta.label}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: col }}>{subj.q} Q</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{subj.minPerQ} min / Q</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                  Fixed pacing mirrors real JEE time pressure. Cannot be modified.
                </div>
              </>
            )}

            {/* Customize Mock sliders */}
            {mockMode === "customize" && (
              <>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>
                  Set question count and time per question for each subject.
                </div>
                {[
                  { name: "physics",   label: "Physics",     q: phyQ,  setQ: setPhyQ,  t: phyT,  setT: setPhyT  },
                  { name: "chemistry", label: "Chemistry",   q: chemQ, setQ: setChemQ, t: chemT, setT: setChemT },
                  { name: "maths",     label: "Mathematics", q: mathQ, setQ: setMathQ, t: mathT, setT: setMathT },
                ].map(({ name, label, q, setQ, t, setT }) => {
                  const col  = subjCol(C, name);
                  const rgba = SUBJ_RGBA[name];
                  return (
                    <div key={name} style={{
                      padding: "14px", borderRadius: 12, marginBottom: 12,
                      background: `rgba(${rgba},.04)`, border: `1px solid rgba(${rgba},.15)`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }}/>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
                        <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: col, fontWeight: 600 }}>
                          {q}Q × {t}m = {(q * t).toFixed(1)}m
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>Questions</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: col }}>{q}</span>
                      </div>
                      <input type="range" min={0} max={50} step={1}
                        value={q} onChange={e => setQ(+e.target.value)}
                        style={{ marginBottom: 10 }}/>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>Min / Question</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: col }}>{t} min</span>
                      </div>
                      <input type="range" min={0.5} max={5} step={0.5}
                        value={t} onChange={e => setT(+e.target.value)}/>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* ── Right: Mock Preview ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="fi3" style={{
              background: C.surface, borderRadius: 18, padding: 22,
              border: `1px solid ${C.border}`, boxShadow: `0 6px 32px ${C.sh}`, flex: 1,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: C.muted, marginBottom: 18, textTransform: "uppercase" }}>
                Mock Preview
              </div>
              {mockSubjects.map(subj => {
                const meta     = SUBJECT_META[subj.name];
                const col      = subjCol(C, subj.name);
                const subjSecs = subj.q * subj.minPerQ * 60;
                return (
                  <div key={subj.name} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 0", borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, color: C.sub }}>{meta.label}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: col }}>
                        {subj.q}Q · {subj.minPerQ}m/Q
                      </span>
                      <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>= {fmt(subjSecs)}</span>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 14 }}>
                <SR C={C} label="Total Questions" val={totalMockQ}                                       col={C.accent}/>
                <SR C={C} label="Total Duration"  val={fmt(totalMockSecs)}                               col={C.blue}/>
                <SR C={C} label="Format"          val={mockMode === "real" ? "REAL MOCK" : "CUSTOMIZE"}  col={C.purple}/>
                <SR C={C} label="Navigation"      val={navType.toUpperCase()}                            col={navType === "open" ? C.blue : C.green}/>
              </div>
            </div>

            <div style={{ background: C.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}`, fontSize: 12, color: C.sub, lineHeight: 1.75 }}>
              {navType === "sectional"
                ? "📋 Sectional: Complete Chemistry, then Physics, then Mathematics in fixed order. Mirrors real JEE exam structure."
                : "🔀 Open: Switch freely between subjects at any time, just like real CBT exams. Your timer per question is saved when you switch."}
            </div>

            <div style={{ background: C.card, borderRadius: 12, padding: "10px 14px", border: `1px solid ${C.border}`, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>SHORTCUTS</span>
              {[["Enter", "Done"], ["N", "Notes"]].map(([k, l]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <kbd style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 7px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: C.accent }}>{k}</kbd>
                  <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Start button */}
      <div style={{ textAlign: "center", marginTop: 38 }}>
        <button className="btn fi3" onClick={handleStart} style={{
          padding: "16px 60px", borderRadius: 14, fontSize: 16, fontWeight: 700, letterSpacing: .5,
          background: sessionType === "mock"
            ? `linear-gradient(135deg, ${C.purple}, ${C.blue})`
            : `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
          color: "#050a10",
          boxShadow: sessionType === "mock"
            ? `0 8px 36px rgba(167,139,250,0.25)`
            : `0 8px 36px rgba(0,180,255,0.22)`,
        }}>
          {sessionType === "mock" ? "Start Mock Exam →" : "Begin Session →"}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SESSION SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function SessionScreen({ C, session, setSession, settings, onEnd }) {
  const [showNotes, setShowNotes] = useState(false);

  const sessRef = useRef(session);
  const settRef = useRef(settings);
  useEffect(() => { sessRef.current = session; },  [session]);
  useEffect(() => { settRef.current = settings; }, [settings]);

  const q = session.qs[session.cur];
  if (!q) return null;

  const allotted   = q.allotted;
  const tl         = session.timeLeft;
  const isOvertime = tl < 0;
  const isPressure = settings.mode === "pressure";
  const isMock     = settings.sessionType === "mock";
  const navType    = settings.navType || null;   // "sectional" | "open" | null
  const accent     = ringColor(C, tl, allotted);
  const progress   = Math.max(0, Math.min(1, tl / allotted));

  // Active subject is always derived from cur question
  const activeSubj = isMock ? q.subject : null;

  const R    = 90;
  const CIRC = 2 * Math.PI * R;

  // Behind-pace warning (study sessions)
  const behindPace = (() => {
    if (!isPressure || session.cur < 2) return false;
    const avgAllotted = session.qs.reduce((a, x) => a + x.allotted, 0) / session.qs.length;
    const elapsed     = Math.round((Date.now() - session.started) / 1000);
    return elapsed > (session.cur + 1.5) * avgAllotted;
  })();

  // Progress counters — for mock, count by status; for study, use linear cur index
  const totalQ  = session.qs.length;
  const doneQ   = isMock
    ? session.qs.filter(q => q.status === "done").length
    : session.cur;
  const sessProc = (doneQ / totalQ) * 100;

  const showRec = !isMock && !isOvertime && progress < 0.2 && progress >= 0;

  // Mini-map: for mock show only active subject's questions; for study show all
  const miniMapQs = isMock
    ? session.qs
        .map((qi, gi) => ({ ...qi, globalIdx: gi }))
        .filter(qi => qi.subject === activeSubj)
    : session.qs.map((qi, gi) => ({ ...qi, globalIdx: gi }));

  const dotSize = miniMapQs.length > 40 ? 19 : 26;
  const dotFont = miniMapQs.length > 40 ? 8 : 9;

  // ── Timer tick ──
  const timerFn = useCallback(() => {
    const s = sessRef.current;
    if (!s || s.paused || s.finished) return;
    const newTl = s.timeLeft - 1;
    if (settRef.current?.tick && newTl >= 0 && newTl <= 10) playTick();
    setSession(prev => ({ ...prev, timeLeft: newTl }));
  }, [setSession]);

  useInterval(timerFn, session.finished ? null : 1000);

  useEffect(() => {
    if (session.finished) onEnd(session);
  }, [session.finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); handlePause(); }
      if (e.code === "Enter") { e.preventDefault(); handleDone(); }
      if (e.code === "KeyN")  { setShowNotes(n => !n); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──

  const handlePause = useCallback(() => {
    if (isPressure || isMock) return; // no pause in pressure or mock
    setSession(prev => ({
      ...prev,
      paused:     !prev.paused,
      pauseCount: prev.paused ? prev.pauseCount : prev.pauseCount + 1,
    }));
  }, [isPressure, isMock, setSession]);

  // Study session Done — original logic preserved exactly
  const handleStudyDone = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      const newQs  = [...prev.qs];
      const spent  = newQs[prev.cur].allotted - prev.timeLeft;
      const saved  = Math.max(0, prev.timeLeft);
      newQs[prev.cur] = { ...newQs[prev.cur], spent, status: "done" };
      const newBank = prev.bank + saved;
      const nextIdx = prev.cur + 1;
      if (nextIdx >= prev.qs.length) {
        return { ...prev, qs: newQs, bank: newBank, finished: true };
      }
      return { ...prev, qs: newQs, bank: newBank, cur: nextIdx, timeLeft: prev.qs[nextIdx].allotted };
    });
  }, [setSession]);

  // Mock session Done — section-aware navigation
  const handleMockDone = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      const newQs   = [...prev.qs];
      const cur     = prev.cur;
      const spent   = newQs[cur].allotted - prev.timeLeft;
      const saved   = Math.max(0, prev.timeLeft);
      newQs[cur]    = { ...newQs[cur], spent, status: "done", savedTime: undefined };
      const newBank = prev.bank + saved;

      // All done?
      if (newQs.every(q => q.status === "done")) {
        return { ...prev, qs: newQs, bank: newBank, finished: true };
      }

      const curSubj    = newQs[cur].subject;
      const nav        = settRef.current?.navType || "sectional";

      // 1. Try next undone in same subject after current index
      const nextInSubj = newQs.findIndex(
        (q, i) => i > cur && q.subject === curSubj && q.status !== "done"
      );
      if (nextInSubj !== -1) {
        const nq = newQs[nextInSubj];
        return { ...prev, qs: newQs, bank: newBank, cur: nextInSubj, timeLeft: nq.savedTime ?? nq.allotted };
      }

      // 2. No more in current subject
      if (nav === "sectional") {
        // Advance to next section in fixed order (no going back)
        const curIdx = SECTION_ORDER.indexOf(curSubj);
        for (let i = curIdx + 1; i < SECTION_ORDER.length; i++) {
          const nextIdx = newQs.findIndex(q => q.subject === SECTION_ORDER[i] && q.status !== "done");
          if (nextIdx !== -1) {
            const nq = newQs[nextIdx];
            return { ...prev, qs: newQs, bank: newBank, cur: nextIdx, timeLeft: nq.savedTime ?? nq.allotted };
          }
        }
      } else {
        // Open: find any next undone across all subjects
        const anyNext = newQs.findIndex(q => q.status !== "done");
        if (anyNext !== -1) {
          const nq = newQs[anyNext];
          return { ...prev, qs: newQs, bank: newBank, cur: anyNext, timeLeft: nq.savedTime ?? nq.allotted };
        }
      }

      // All sections exhausted
      return { ...prev, qs: newQs, bank: newBank, finished: true };
    });
  }, [setSession]);

  const handleDone = isMock ? handleMockDone : handleStudyDone;

  // ── Switch subject (open mock only) ──
  const handleSwitchSubject = useCallback((targetSubj) => {
    setSession(prev => {
      if (!prev || prev.qs[prev.cur]?.subject === targetSubj) return prev;
      const newQs = [...prev.qs];
      const cur   = prev.cur;
      // Save remaining time on current Q if not yet done
      if (newQs[cur].status !== "done") {
        newQs[cur] = { ...newQs[cur], savedTime: prev.timeLeft, status: "visited" };
      }
      // Jump to first non-done Q in target subject
      const targetIdx = newQs.findIndex(q => q.subject === targetSubj && q.status !== "done");
      if (targetIdx === -1) {
        // All done in target — just view first Q of that subject
        const viewIdx = newQs.findIndex(q => q.subject === targetSubj);
        if (viewIdx === -1) return prev;
        return { ...prev, qs: newQs, cur: viewIdx, timeLeft: 0 };
      }
      const nq = newQs[targetIdx];
      return { ...prev, qs: newQs, cur: targetIdx, timeLeft: nq.savedTime ?? nq.allotted };
    });
  }, [setSession]);

  // ── Click a question dot to jump (within active subject) ──
  const handleJumpTo = useCallback((globalIdx) => {
    setSession(prev => {
      if (!prev || prev.cur === globalIdx) return prev;
      const newQs = [...prev.qs];
      const cur   = prev.cur;
      if (newQs[cur].status !== "done") {
        newQs[cur] = { ...newQs[cur], savedTime: prev.timeLeft, status: "visited" };
      }
      const nq = newQs[globalIdx];
      return {
        ...prev,
        qs: newQs,
        cur: globalIdx,
        timeLeft: nq.savedTime ?? nq.allotted,
      };
    });
  }, [setSession]);

  const handleEndEarly = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev;
      const newQs = [...prev.qs];
      const spent = newQs[prev.cur].allotted - prev.timeLeft;
      newQs[prev.cur] = { ...newQs[prev.cur], spent, status: "done" };
      return { ...prev, qs: newQs, finished: true };
    });
  }, [setSession]);

  return (
    <div style={{ paddingTop: 32, paddingBottom: 60, maxWidth: 560, margin: "0 auto" }}>

      {/* ── Mock subject navigation tabs ── */}
      {isMock && navType && (
        <MockSubjectNav
          C={C}
          session={session}
          navType={navType}
          onSwitch={handleSwitchSubject}
        />
      )}

      {/* ── Session progress bar ── */}
      <div className="fi" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
          <span style={{ color: C.sub }}>Session Progress</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.accent, fontWeight: 600 }}>
            {doneQ}/{totalQ} done · {Math.round(sessProc)}%
          </span>
        </div>
        <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${sessProc}%`,
            background: isMock
              ? `linear-gradient(90deg, ${C.purple}, ${C.blue})`
              : `linear-gradient(90deg, ${C.blue}, ${C.accent})`,
            borderRadius: 3, transition: "width .6s ease",
          }}/>
        </div>
      </div>

      {/* ── Question label ── */}
      <div className="pop" key={`qlabel-${session.cur}`} style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "7px 20px", borderRadius: 22,
          background: C.card, border: `1px solid ${C.border}`,
        }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700, color: C.accent }}>
            Q{session.cur + 1}
          </span>
          <span style={{ color: C.muted, fontSize: 13 }}>of {totalQ}</span>

          {/* Subject badge */}
          {isMock && q.subject && (() => {
            const rgba = SUBJ_RGBA[q.subject] || "77,143,255";
            const col  = subjCol(C, q.subject);
            const meta = SUBJECT_META[q.subject];
            return (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
                background: `rgba(${rgba},.12)`, color: col,
                border: `1px solid rgba(${rgba},.28)`,
              }}>{meta?.short || q.subject.toUpperCase()}</span>
            );
          })()}

          {/* Nav type badge */}
          {isMock && navType && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
              background: navType === "open"
                ? "rgba(77,143,255,.12)" : "rgba(74,222,128,.12)",
              color: navType === "open" ? C.blue : C.green,
              border: navType === "open"
                ? "1px solid rgba(77,143,255,.25)" : "1px solid rgba(74,222,128,.25)",
            }}>{navType === "open" ? "OPEN" : "SECT"}</span>
          )}

          {/* Visited badge */}
          {isMock && q.status === "visited" && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
              background: "rgba(250,204,21,.1)", color: C.yellow,
              border: "1px solid rgba(250,204,21,.25)",
            }}>REVISIT</span>
          )}

          {/* Study session badges — unchanged */}
          {!isMock && settings.mode === "adaptive" && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
              background: q.diff === "easy"   ? "rgba(74,222,128,.12)" :
                          q.diff === "medium" ? "rgba(250,204,21,.12)" : "rgba(248,113,113,.12)",
              color: q.diff === "easy" ? C.green : q.diff === "medium" ? C.yellow : C.red,
              border: `1px solid ${q.diff === "easy" ? C.green + "30" : q.diff === "medium" ? C.yellow + "30" : C.red + "30"}`,
            }}>{DIFF_LABEL[q.diff].toUpperCase()}</span>
          )}
          {isPressure && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10, background: "rgba(248,113,113,.12)", color: C.red, border: "1px solid rgba(248,113,113,.25)" }}>PRESSURE</span>
          )}
          {session.paused && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10, background: "rgba(167,139,250,.12)", color: C.purple, border: "1px solid rgba(167,139,250,.25)" }}>PAUSED</span>
          )}
        </div>
      </div>

      {/* ── Circular Timer (unchanged) ── */}
      <div className="pop" key={`timer-${session.cur}`}
        style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div style={{ position: "relative", width: 240, height: 240 }}>
          <svg width="240" height="240" viewBox="0 0 240 240" fill="none"
            style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            {Array.from({ length: 60 }, (_, i) => {
              const angle   = (i / 60) * 2 * Math.PI;
              const isMajor = i % 5 === 0;
              const r1 = isMajor ? 112 : 114;
              return (
                <line key={i}
                  x1={120 + r1 * Math.cos(angle)}   y1={120 + r1 * Math.sin(angle)}
                  x2={120 + 118 * Math.cos(angle)}  y2={120 + 118 * Math.sin(angle)}
                  stroke={C.border} strokeWidth={isMajor ? 2 : 1} strokeLinecap="round"/>
              );
            })}
            <circle cx="120" cy="120" r={R} fill="none"
              stroke={C.border} strokeWidth="10" strokeLinecap="round"/>
            <circle cx="120" cy="120" r={R} fill="none"
              stroke={accent} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`}
              strokeDashoffset={CIRC * (1 - progress)}
              style={{
                transition: "stroke-dashoffset .55s ease, stroke .3s ease",
                filter: `drop-shadow(0 0 10px ${accent}70)`,
              }}/>
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            {isOvertime && (
              <div className="blink" style={{ fontSize: 9, letterSpacing: 2, color: C.red, fontWeight: 700, textTransform: "uppercase" }}>
                OVERTIME
              </div>
            )}
            <div className={isOvertime ? "blink" : "pulse-glow"} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 40, fontWeight: 700, color: accent, letterSpacing: -1.5,
            }}>
              {fmt(tl)}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>of {fmt(allotted)}</div>
            {session.bank > 0 && (
              <div style={{
                marginTop: 6, fontSize: 10, padding: "2px 9px",
                background: "rgba(74,222,128,.08)", color: C.green,
                borderRadius: 10, border: "1px solid rgba(74,222,128,.2)",
              }}>
                🏦 +{fmt(session.bank)} banked
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {showRec && (
        <div className="fi" style={{
          textAlign: "center", margin: "0 auto 18px",
          padding: "9px 18px", borderRadius: 10, fontSize: 12,
          background: "rgba(250,204,21,.07)", color: C.yellow,
          border: "1px solid rgba(250,204,21,.2)", maxWidth: 360,
        }}>
          ⚠ Running low — consider moving on and marking for review.
        </div>
      )}
      {behindPace && isPressure && (
        <div className="fi blink" style={{
          textAlign: "center", margin: "0 auto 18px",
          padding: "9px 18px", borderRadius: 10, fontSize: 12,
          background: "rgba(248,113,113,.07)", color: C.red,
          border: "1px solid rgba(248,113,113,.2)", maxWidth: 360,
        }}>
          🔥 Behind pace — speed up now.
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 26, flexWrap: "wrap" }}>
        {!isPressure && !isMock && (
          <button className="btn" onClick={handlePause} style={{
            padding: "12px 26px", borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: session.paused ? `rgba(0,212,255,.08)` : C.surface,
            color: session.paused ? C.accent : C.sub,
            border: `1px solid ${session.paused ? C.accent : C.border}`,
          }}>
            {session.paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        )}

        <button className="btn" onClick={handleDone} style={{
          padding: "12px 40px", borderRadius: 12, fontSize: 15, fontWeight: 700,
          background: isMock
            ? `linear-gradient(135deg, ${C.purple}, ${C.blue})`
            : `linear-gradient(135deg, ${C.blue}, ${C.accent})`,
          color: "#050a10",
          boxShadow: isMock
            ? `0 4px 24px rgba(167,139,250,.22)`
            : `0 4px 24px rgba(0,180,255,.22)`,
        }}>
          Done → Next
        </button>

        <button className="btn" onClick={() => setShowNotes(n => !n)} style={{
          padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500,
          background: showNotes ? `rgba(167,139,250,.08)` : C.surface,
          color: showNotes ? C.purple : C.sub,
          border: `1px solid ${showNotes ? C.purple + "60" : C.border}`,
        }}>
          📝 Notes
        </button>
      </div>

      {/* ── Question mini-map ──
          For mock: shows only active subject's questions (25 dots max).
          Dots are clickable to jump to any non-done question.
          For study: original full-session map (unchanged).
      ── */}
      <div style={{
        background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 18,
      }}>
        {/* Subject context header for mock mini-map */}
        {isMock && activeSubj && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: subjCol(C, activeSubj), flexShrink: 0 }}/>
              <span style={{ fontSize: 10, color: C.sub, fontWeight: 600, letterSpacing: .5 }}>
                {SUBJECT_META[activeSubj]?.label}
              </span>
            </div>
            <span style={{ fontSize: 10, color: C.muted }}>
              {miniMapQs.filter(qi => qi.status === "done").length}/{miniMapQs.length} done
              {navType === "open" && <span style={{ marginLeft: 5, color: C.blue }}>· tap to jump</span>}
            </span>
          </div>
        )}

        <div style={{
          display: "flex", flexWrap: "wrap", gap: isMock ? 5 : 6,
          justifyContent: "center", padding: isMock ? "10px 14px 14px" : "14px 16px",
        }}>
          {miniMapQs.map((qItem, mapIdx) => {
            const isDone    = qItem.status === "done";
            const isVisited = qItem.status === "visited";
            const isCurrent = qItem.globalIdx === session.cur;
            const rgba      = isMock && qItem.subject ? SUBJ_RGBA[qItem.subject] : null;

            const bg = rgba
              ? (isDone    ? `rgba(${rgba},.2)`  :
                 isVisited ? `rgba(${rgba},.08)` :
                 isCurrent ? subjCol(C, qItem.subject) : C.card)
              : (isDone ? "rgba(74,222,128,.12)" : isCurrent ? C.accent : C.card);

            const color = rgba
              ? (isDone || isVisited ? subjCol(C, qItem.subject) : isCurrent ? "#050a10" : C.muted)
              : (isDone ? C.green : isCurrent ? "#050a10" : C.muted);

            const border = rgba
              ? `1px solid ${
                  isDone    ? `rgba(${rgba},.4)`  :
                  isVisited ? `rgba(${rgba},.3)`  :
                  isCurrent ? `rgba(${rgba},1)`   : C.border}`
              : `1px solid ${isDone ? "rgba(74,222,128,.3)" : isCurrent ? C.accent : C.border}`;

            // Clickable: in mock (both nav types) for non-done questions
            const isJumpable = isMock && !isDone;

            return (
              <div key={qItem.globalIdx}
                onClick={() => isJumpable && handleJumpTo(qItem.globalIdx)}
                style={{
                  width: dotSize, height: dotSize, borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: dotFont, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                  background: bg, color, border,
                  transform:  isCurrent ? "scale(1.18)" : "scale(1)",
                  transition: "all .25s",
                  cursor: isJumpable ? "pointer" : "default",
                  // Slight yellow ring for visited-but-not-done
                  outline: isVisited && !isCurrent ? `1.5px solid rgba(250,204,21,.45)` : "none",
                  outlineOffset: "1px",
                }}>
                {mapIdx + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Notes drawer ── */}
      {showNotes && (
        <div className="fi" style={{
          marginBottom: 18, background: C.surface, borderRadius: 14,
          border: `1px solid ${C.purple}35`, padding: 16,
        }}>
          <div style={{ fontSize: 10, color: C.purple, marginBottom: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Session Notes
          </div>
          <textarea
            value={session.notes}
            onChange={e => setSession(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Observations, doubts, patterns you noticed..."
            autoFocus rows={4}
            style={{
              width: "100%", background: C.card, color: C.text,
              border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 12px", fontSize: 13, lineHeight: 1.65, resize: "none",
            }}
          />
        </div>
      )}

      {/* End early */}
      <div style={{ textAlign: "center" }}>
        <button className="btn" onClick={handleEndEarly} style={{
          fontSize: 11, color: C.muted, background: "none",
          textDecoration: "underline", padding: 4, letterSpacing: .3,
        }}>End session early</button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANALYTICS SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function AnalyticsScreen({ C, analytics, onRestart }) {
  const { qs, bank, pauseCount, totalSecs, notes, sessionType, mockMode, navType } = analytics;
  const isMock = sessionType === "mock";

  const done       = qs.filter(q => q.spent != null);
  const n          = done.length;
  const avgSpent   = n > 0 ? Math.round(done.reduce((a, q) => a + q.spent, 0) / n) : 0;
  const overtime   = done.filter(q => q.spent > q.allotted).length;
  const fastest    = n > 0 ? done.reduce((a, q) => q.spent < a.spent ? q : a) : null;
  const slowest    = n > 0 ? done.reduce((a, q) => q.spent > a.spent ? q : a) : null;
  const allTotal   = qs.reduce((a, q) => a + q.allotted, 0);
  const spentTotal = done.reduce((a, q) => a + q.spent, 0);
  const efficiency = allTotal > 0
    ? Math.round(Math.min(100, Math.max(0,
        ((n / qs.length) * 100) - (Math.max(0, spentTotal - allTotal) / allTotal * 30)
      )))
    : 0;

  const chartData = qs.map((q, i) => ({
    name:     `Q${i + 1}`,
    allotted: q.allotted,
    spent:    q.spent ?? 0,
    ot:       q.spent > q.allotted,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const allot = payload.find(p => p.dataKey === "allotted")?.value ?? 0;
    const spent = payload.find(p => p.dataKey === "spent")?.value ?? 0;
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: C.text }}>{label}</div>
        <div style={{ color: C.sub }}>Allotted: {fmt(allot)}</div>
        <div style={{ color: spent > allot ? C.red : C.green }}>Spent: {fmt(spent)}</div>
      </div>
    );
  };

  const effCol = efficiency >= 75 ? C.green : efficiency >= 50 ? C.yellow : C.red;

  // Mock subject breakdown
  const subjectBreakdown = isMock
    ? ["physics", "chemistry", "maths"].map(subj => {
        const sqs      = done.filter(q => q.subject === subj);
        if (!sqs.length) return null;
        const allottedT = sqs.reduce((a, q) => a + q.allotted, 0);
        const spentT    = sqs.reduce((a, q) => a + q.spent, 0);
        const ot        = sqs.filter(q => q.spent > q.allotted).length;
        const eff       = allottedT > 0 ? Math.round(Math.min(100, (allottedT / Math.max(spentT, 1)) * 100)) : 0;
        return { subj, count: sqs.length, allottedT, spentT, ot, eff };
      }).filter(Boolean)
    : null;

  return (
    <div style={{ paddingTop: 36, paddingBottom: 60 }}>
      {/* Header */}
      <div className="fi" style={{ textAlign: "center", marginBottom: 36 }}>
        {isMock && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "3px 12px", borderRadius: 20,
              background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.25)",
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: C.purple, textTransform: "uppercase" }}>
                {mockMode === "real" ? "Real Mock" : "Custom Mock"}
              </span>
            </div>
            {navType && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "3px 12px", borderRadius: 20,
                background: navType === "open" ? "rgba(77,143,255,.1)" : "rgba(74,222,128,.1)",
                border: navType === "open" ? "1px solid rgba(77,143,255,.25)" : "1px solid rgba(74,222,128,.25)",
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                  color: navType === "open" ? C.blue : C.green, textTransform: "uppercase" }}>
                  {navType === "open" ? "Open Nav" : "Sectional"}
                </span>
              </div>
            )}
          </div>
        )}
        <div style={{ fontSize: 10, letterSpacing: 2.5, color: C.accent, textTransform: "uppercase", marginBottom: 8 }}>
          Session Complete
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -.5 }}>Performance Report</h1>
        <p style={{ color: C.sub, fontSize: 13, marginTop: 6 }}>
          {n} of {qs.length} questions completed · {fmt(totalSecs)} total
        </p>
      </div>

      {/* Primary stats */}
      <div className="fi2 stats-4" style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18,
      }}>
        {[
          { label: "Completed",  value: `${n}/${qs.length}`, col: C.accent },
          { label: "Avg / Q",    value: fmt(avgSpent),        col: C.blue  },
          { label: "Time Saved", value: fmt(bank),            col: C.green },
          { label: "Efficiency", value: `${efficiency}%`,     col: effCol  },
        ].map(({ label, value, col }) => (
          <div key={label} style={{
            background: C.surface, borderRadius: 14, padding: "16px 18px",
            border: `1px solid ${C.border}`, boxShadow: `0 4px 20px ${C.sh}`,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: col }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="fi3 stats-3" style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 26,
      }}>
        {[
          { label: "Overtime Qs",  value: overtime,       col: overtime > 2 ? C.red : C.sub },
          { label: "Pauses Taken", value: pauseCount,     col: pauseCount > 3 ? C.yellow : C.sub },
          { label: "Total Time",   value: fmt(totalSecs), col: C.sub },
        ].map(({ label, value, col }) => (
          <div key={label} style={{ background: C.card, borderRadius: 12, padding: "12px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 600, color: col }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Subject Breakdown (mock only) */}
      {isMock && subjectBreakdown && subjectBreakdown.length > 0 && (
        <div style={{
          background: C.surface, borderRadius: 16, padding: "20px 16px",
          border: `1px solid ${C.border}`, marginBottom: 22, boxShadow: `0 6px 28px ${C.sh}`,
        }}>
          <SectionTitle C={C} text="Subject Breakdown"/>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {subjectBreakdown.map(({ subj, count, allottedT, spentT, ot, eff }) => {
              const col   = subjCol(C, subj);
              const rgba  = SUBJ_RGBA[subj];
              const meta  = SUBJECT_META[subj];
              const effC  = eff >= 80 ? C.green : eff >= 55 ? C.yellow : C.red;
              const ratio = allottedT > 0 ? Math.min(1, spentT / allottedT) : 0;
              return (
                <div key={subj} style={{
                  padding: "14px 16px", borderRadius: 12,
                  background: `rgba(${rgba},.04)`, border: `1px solid rgba(${rgba},.15)`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: col, flexShrink: 0 }}/>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{meta.label}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{count} q</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      {ot > 0 && <span style={{ fontSize: 10, color: C.red, fontWeight: 600 }}>{ot} overtime</span>}
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: effC }}>{eff}%</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${ratio * 100}%`,
                        background: `linear-gradient(90deg, rgba(${rgba},.5), rgba(${rgba},1))`,
                        borderRadius: 3,
                      }}/>
                    </div>
                    <span style={{ fontSize: 11, color: C.sub, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>
                      {fmt(spentT)} / {fmt(allottedT)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div style={{
        background: C.surface, borderRadius: 16, padding: "20px 14px",
        border: `1px solid ${C.border}`, marginBottom: 22, boxShadow: `0 6px 28px ${C.sh}`,
      }}>
        <SectionTitle C={C} text="Allotted vs Actual Time Per Question"/>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={chartData} barGap={2} barSize={qs.length > 40 ? 5 : 10}
            margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="name"
              tick={{ fill: C.muted, fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}
              axisLine={false} tickLine={false}
              interval={qs.length > 40 ? Math.floor(qs.length / 15) : 0}/>
            <YAxis tickFormatter={v => `${Math.floor(v / 60)}m`}
              tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip/>} cursor={{ fill: "rgba(255,255,255,.03)" }}/>
            <Bar dataKey="allotted" fill={C.border} radius={[3,3,0,0]} name="Allotted"/>
            <Bar dataKey="spent" radius={[3,3,0,0]} name="Spent">
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.ot ? C.red : C.blue}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
          {[[C.border, "Allotted"], [C.blue, "On Time"], [C.red, "Overtime"]].map(([col, lbl]) => (
            <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.sub }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }}/>
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Session replay timeline */}
      <div style={{
        background: C.surface, borderRadius: 16, padding: "20px 16px",
        border: `1px solid ${C.border}`, marginBottom: 22,
      }}>
        <SectionTitle C={C} text="Session Replay Timeline"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {qs.map((q, i) => {
            if (q.spent == null) return null;
            const ratio = q.allotted > 0 ? q.spent / q.allotted : 0;
            const col   = isMock && q.subject
              ? subjCol(C, q.subject)
              : (ratio > 1.0 ? C.red : ratio > 0.85 ? C.yellow : C.green);
            const barW  = Math.min(100, ratio * 100);
            const tag   = ratio < 0.5 ? "Fast" : ratio > 1 ? "OT" : null;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: C.muted, width: 26, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>
                  Q{i + 1}
                </span>
                <div style={{ flex: 1, height: 22, background: C.card, borderRadius: 5, position: "relative" }}>
                  <div style={{
                    height: "100%", width: `${Math.min(100, barW)}%`,
                    background: `linear-gradient(90deg, ${col}60, ${col})`,
                    borderRadius: 5, minWidth: 4,
                    transition: "width .9s cubic-bezier(.22,1,.36,1)",
                  }}/>
                  <div style={{ position: "absolute", top: -2, right: 0, width: 1, height: 26, background: C.border }}/>
                </div>
                <span style={{ fontSize: 10, color: col, width: 44, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>
                  {fmt(q.spent)}
                </span>
                {tag && (
                  <span style={{
                    fontSize: 8, padding: "1px 6px", borderRadius: 6, flexShrink: 0,
                    background: tag === "Fast" ? "rgba(74,222,128,.1)" : "rgba(248,113,113,.1)",
                    color: tag === "Fast" ? C.green : C.red,
                    fontWeight: 700, letterSpacing: .5,
                  }}>{tag.toUpperCase()}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick insights */}
      {(fastest || slowest) && (
        <div style={{
          background: C.card, borderRadius: 14, padding: "16px 18px",
          border: `1px solid ${C.border}`, marginBottom: 22,
          display: "flex", gap: 20, flexWrap: "wrap",
        }}>
          <SectionTitle C={C} text="Quick Insights" style={{ width: "100%", marginBottom: 10 }}/>
          {fastest  && <Insight C={C} icon="⚡" title="Fastest"    desc={`Q${fastest.idx + 1} — ${fmt(fastest.spent)}`}/>}
          {slowest  && <Insight C={C} icon="🐢" title="Slowest"    desc={`Q${slowest.idx + 1} — ${fmt(slowest.spent)}`}/>}
          {overtime > 0 && <Insight C={C} icon="⏱" title="Overtime" desc={`${overtime} question${overtime > 1 ? "s" : ""} exceeded allotted time`}/>}
          {bank > 0     && <Insight C={C} icon="🏦" title="Time Saved" desc={`${fmt(bank)} banked through efficient solving`}/>}
        </div>
      )}

      {/* Session notes */}
      {notes && (
        <div style={{
          background: C.surface, borderRadius: 14, padding: "16px 18px",
          border: `1px solid ${C.purple}25`, marginBottom: 22,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: C.purple, marginBottom: 10, textTransform: "uppercase" }}>Session Notes</div>
          <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.75 }}>{notes}</div>
        </div>
      )}

      {/* Restart */}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn" onClick={onRestart} style={{
          padding: "14px 52px", borderRadius: 14, fontSize: 15, fontWeight: 700,
          background: isMock
            ? `linear-gradient(135deg, ${C.purple}, ${C.blue})`
            : `linear-gradient(135deg, ${C.blue}, ${C.accent})`,
          color: "#050a10",
          boxShadow: isMock
            ? `0 6px 30px rgba(167,139,250,.2)` : `0 6px 30px rgba(0,180,255,.18)`,
        }}>
          Start New Session
        </button>
      </div>
    </div>
  );
}
