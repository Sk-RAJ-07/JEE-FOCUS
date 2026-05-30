import { useState, useCallback } from "react";
import { DARK, LIGHT, DIFF_SECS } from "./constants";
import { GS, TopBar } from "./components";
import { SetupScreen, SessionScreen, AnalyticsScreen } from "./screens";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT APP  —  manages phase machine + session state
// Phases: "setup" → "session" → "analytics" → "setup"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App() {
  const [theme,     setTheme]     = useState("dark");
  const [phase,     setPhase]     = useState("setup");
  const [settings,  setSettings]  = useState(null);
  const [session,   setSession]   = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const C = theme === "dark" ? DARK : LIGHT;

  // ── Build session from setup config ──
  const handleStart = (cfg) => {
    setSettings(cfg);

    let qs;

    if (cfg.sessionType === "mock") {
      // Mock: flatten subjects → questions array, each tagged with subject
      let globalIdx = 0;
      qs = cfg.subjects.flatMap(subj =>
        subj.q > 0
          ? Array.from({ length: subj.q }, () => ({
              idx:       globalIdx++,
              diff:      "medium",
              allotted:  Math.round(subj.minPerQ * 60),
              spent:     null,
              status:    "pending",   // "pending" | "visited" | "done"
              subject:   subj.name,
              savedTime: undefined,   // remaining time saved when user switches away mid-question
            }))
          : []
      );
      qs = qs.map((q, i) => ({ ...q, idx: i }));

    } else {
      // ✅ Study session — existing logic preserved exactly
      const perQ = cfg.mode === "adaptive"
        ? null
        : Math.floor((cfg.totalMin * 60) / cfg.numQ);

      qs = cfg.diffs.map((d, i) => ({
        idx:      i,
        diff:     d,
        allotted: cfg.mode === "adaptive" ? DIFF_SECS[d] : perQ,
        spent:    null,
        status:   "pending",
      }));
    }

    setSession({
      qs,
      cur:        0,
      timeLeft:   qs[0].allotted,
      bank:       0,
      paused:     false,
      notes:      "",
      pauseCount: 0,
      started:    Date.now(),
      finished:   false,
      sessionType: cfg.sessionType || "study",
      mockMode:    cfg.mockMode    || null,
      navType:     cfg.navType     || null,   // "sectional" | "open" | null (study)
    });

    setPhase("session");
  };

  // ── Session → Analytics ──
  const handleEnd = useCallback((sess) => {
    const totalSecs = Math.round((Date.now() - sess.started) / 1000);
    setAnalytics({
      qs:          sess.qs,
      bank:        sess.bank,
      pauseCount:  sess.pauseCount,
      totalSecs,
      notes:       sess.notes,
      sessionType: sess.sessionType || "study",
      mockMode:    sess.mockMode    || null,
      navType:     sess.navType     || null,
    });
    setPhase("analytics");
  }, []);

  // ── Full reset ──
  const reset = () => {
    setPhase("setup");
    setSession(null);
    setSettings(null);
    setAnalytics(null);
  };

  return (
    <div style={{
      fontFamily: "'Sora', sans-serif",
      background: C.bg,
      minHeight: "100vh",
      color: C.text,
      transition: "background .35s, color .25s",
    }}>
      <GS C={C}/>
      <TopBar C={C} theme={theme} setTheme={setTheme} phase={phase} onReset={reset}/>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px" }}>
        {phase === "setup" && (
          <SetupScreen C={C} onStart={handleStart}/>
        )}
        {phase === "session" && session && (
          <SessionScreen
            C={C}
            session={session}
            setSession={setSession}
            settings={settings}
            onEnd={handleEnd}
          />
        )}
        {phase === "analytics" && analytics && (
          <AnalyticsScreen C={C} analytics={analytics} onRestart={reset}/>
        )}
      </main>
    </div>
  );
}
