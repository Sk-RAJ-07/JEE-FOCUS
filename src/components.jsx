// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED UI COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Injects global CSS: fonts, animations, scrollbar, input resets */
export function GS({ C }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Sora:wght@300;400;500;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${C.bg}; font-family: 'Sora', sans-serif; color: ${C.text}; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      .fi  { animation: fi  .38s cubic-bezier(.22,1,.36,1) both; }
      .fi2 { animation: fi  .38s cubic-bezier(.22,1,.36,1) .12s both; }
      .fi3 { animation: fi  .38s cubic-bezier(.22,1,.36,1) .22s both; }
      @keyframes fi  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
      .pop { animation: pop .32s cubic-bezier(.34,1.56,.64,1) both; }
      @keyframes pop { from { opacity:0; transform:scale(.82); } to { opacity:1; transform:scale(1); } }
      .blink { animation: blink 1s ease-in-out infinite; }
      @keyframes blink { 0%,100%{opacity:.55} 50%{opacity:1} }
      .spin  { animation: spin 18s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .pulse-glow { animation: pglow 2.5s ease-in-out infinite; }
      @keyframes pglow { 0%,100%{filter:brightness(.9)} 50%{filter:brightness(1.15)} }
      input[type=range] {
        -webkit-appearance: none; width: 100%; height: 4px;
        border-radius: 2px; background: ${C.border}; outline: none; cursor: pointer;
      }
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none; width: 18px; height: 18px;
        border-radius: 50%; background: ${C.accent}; transition: transform .15s;
      }
      input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.25); }
      .btn { cursor: pointer; border: none; outline: none; font-family: 'Sora',sans-serif;
             transition: filter .15s, transform .15s; }
      .btn:hover  { filter: brightness(1.12); transform: translateY(-1px); }
      .btn:active { transform: scale(.96); }
      textarea, input[type=text], input[type=number] { outline: none; font-family: inherit; }
      @media (max-width: 640px) {
        .setup-grid  { grid-template-columns: 1fr !important; }
        .stats-4     { grid-template-columns: 1fr 1fr !important; }
        .stats-3     { grid-template-columns: 1fr 1fr !important; }
        .mode-tabs   { flex-direction: column !important; gap: 8px !important; }
      }
      @media (max-width: 380px) {
        .stats-4 { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}

/** Sticky top navigation bar with logo + theme toggle + reset */
export function TopBar({ C, theme, setTheme, phase, onReset }) {
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 24px", borderBottom: `1px solid ${C.border}`,
      background: C.surface, position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Logo mark */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke={C.accent} strokeWidth="1.5" opacity=".25" className="spin"/>
          <circle cx="16" cy="16" r="10" stroke={C.accent} strokeWidth="1.5" opacity=".5"/>
          <circle cx="16" cy="16" r="2.5" fill={C.accent}/>
          <line x1="16" y1="6" x2="16" y2="16" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="16" x2="22" y2="19" stroke={C.sub} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1, color: C.text }}>JEE FOCUS</div>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.8, textTransform: "uppercase" }}>Exam Training</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {phase !== "setup" && (
          <button className="btn" onClick={onReset} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.sub, letterSpacing: .5,
          }}>← Reset</button>
        )}
        {/* Theme toggle */}
        <button
          className="btn"
          onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          style={{
            width: 44, height: 24, borderRadius: 12, position: "relative", padding: 0,
            background: theme === "dark" ? C.accent : C.border,
            transition: "background .3s",
          }}
        >
          <div style={{
            position: "absolute", top: 3,
            left: theme === "dark" ? 23 : 3,
            width: 18, height: 18, borderRadius: "50%",
            background: "#fff", boxShadow: "0 1px 5px rgba(0,0,0,.35)",
            transition: "left .25s cubic-bezier(.34,1.56,.64,1)",
          }}/>
        </button>
      </div>
    </header>
  );
}

/** Slider label row — label on left, value on right */
export function Label({ C, label, val, col }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: C.sub }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: col }}>{val}</span>
    </div>
  );
}

/** Session preview row with bottom border divider */
export function SR({ C, label, val, col }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 12, color: C.sub }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 600, color: col }}>{val}</span>
    </div>
  );
}

/** Small pill-shaped toggle switch */
export function Toggle({ on, setOn, col }) {
  return (
    <button
      className="btn"
      onClick={() => setOn(v => !v)}
      style={{
        width: 40, height: 22, borderRadius: 11, position: "relative", padding: 0,
        background: on ? col : "#333a4a", transition: "background .25s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: on ? 20 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.4)",
        transition: "left .22s cubic-bezier(.34,1.56,.64,1)",
      }}/>
    </button>
  );
}

/** Small all-caps section heading used in Analytics */
export function SectionTitle({ C, text }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: 2, color: C.muted,
      textTransform: "uppercase", marginBottom: 16,
    }}>{text}</div>
  );
}

/** Insight card used in Analytics quick-insights row */
export function Insight({ C, icon, title, desc }) {
  return (
    <div style={{ flex: "1 1 160px" }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{icon} {title}</div>
      <div style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{desc}</div>
    </div>
  );
}
