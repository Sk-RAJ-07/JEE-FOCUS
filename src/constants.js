// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEMES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const DARK = {
  bg: "#0f1115",     surface: "#171a21",  card: "#1c2132",
  border: "#252d40", text: "#edf2f8",     sub: "#7a8fa8",
  muted: "#3d4f65",  accent: "#00d4ff",   blue: "#4d8fff",
  purple: "#a78bfa", green: "#4ade80",    yellow: "#facc15",
  red: "#f87171",    sh: "rgba(0,0,0,0.55)",
};

export const LIGHT = {
  bg: "#eef3ff",     surface: "#ffffff",  card: "#e4ecff",
  border: "#cdd8f0", text: "#0d1b2a",     sub: "#4a5a78",
  muted: "#8899ba",  accent: "#0077bb",   blue: "#2255d0",
  purple: "#7c3aed", green: "#15803d",    yellow: "#b45309",
  red: "#c02030",    sh: "rgba(0,20,80,0.1)",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADAPTIVE MODE — per-difficulty time allotments (seconds)
// Equal / Pressure mode calculates perQ = totalSeconds / numQ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const DIFF_SECS  = { easy: 300, medium: 480, hard: 720 };
export const DIFF_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK SESSION — subject metadata & fixed real-mock config
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Subject display metadata — colours as raw rgba for inline usage */
export const SUBJECT_META = {
  physics:   { label: "Physics",     short: "PHY", rgba: "77,143,255"  },
  chemistry: { label: "Chemistry",   short: "CHE", rgba: "74,222,128"  },
  maths:     { label: "Mathematics", short: "MTH", rgba: "167,139,250" },
};

/** Fixed pacing for Real Mock mode (JEE-standard simulation) */
export const REAL_MOCK_SUBJECTS = [
  { name: "chemistry", q: 25, minPerQ: 1.5 },
  { name: "physics",   q: 25, minPerQ: 2   },
  { name: "maths",     q: 25, minPerQ: 3   },
];
