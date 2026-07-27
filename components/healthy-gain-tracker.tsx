"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Home, TrendingUp, Utensils, Dumbbell, Watch, Settings, Plus, Check,
  ArrowUpRight, ArrowDownRight, Minus, Zap, Target, Moon, Footprints, Flame,
  RefreshCw, Link2, Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ============================================================================
   HEALTHY GAIN TRACKER  —  offline-first, wearable-ready
   ----------------------------------------------------------------------------
   • Runs fully offline. State persists via localStorage (no network needed).
   • Adaptive calorie engine: recomputes maintenance as your logged weight rises.
   • PACE engine: compares your 7-day weight trend to your target rate and tells
     you exactly how many calories to add or cut (the playbook's adaptive rule).
   • WEARABLE HOOK: see `WearableProvider` below. It's a clean abstraction with a
     mock sync today. Swap the `sync()` body for Apple HealthKit / Android Health
     Connect / Fitbit / Garmin later — the rest of the app doesn't change.
   ========================================================================== */

const C = {
  bg: "#0F1216", surface: "#171B21", surface2: "#1E242C", line: "#2A313B",
  gold: "#E0A82E", goldSoft: "rgba(224,168,46,0.12)", text: "#EDEFF2",
  muted: "#8A93A3", green: "#3FB68B", greenSoft: "rgba(63,182,139,0.12)",
  red: "#E06A4E", redSoft: "rgba(224,106,78,0.12)", blue: "#5B9BD5",
} as const;

const STORE_KEY = "gain-tracker-v1";
const todayStr = () => new Date().toISOString().slice(0, 10);

type Sex = "male" | "female";
type Activity = "sedentary" | "light" | "moderate" | "active" | "athlete";

const ACTIVITY: Record<Activity, number> = {
  sedentary: 1.3, light: 1.45, moderate: 1.55, active: 1.7, athlete: 1.85,
};

/* ---------- data model ---------- */
interface Profile {
  heightIn: number;
  weightLb: number;
  age: number;
  sex: Sex;
  activity: Activity;
  goalLb: number;
  _seedWeight?: boolean;
}
interface WeightEntry { date: string; lb: number; }
interface DayIntake { cal: number; protein: number; }
interface Workout { date: string; exercise: string; weight: number; reps: number; }
interface WearableMetrics {
  steps: number;
  activeCal: number;
  sleepHr: number;
  restingHr: number;
  weight: number;
  syncedAt: string;
}
interface WearableState { connected: boolean; metrics: WearableMetrics | null; }
interface AppState {
  profile: Profile | null;
  weights: WeightEntry[];
  intake: Record<string, DayIntake>;
  workouts: Workout[];
  surplus: number;
  wearable: WearableState;
}

type TabId = "home" | "weight" | "eat" | "train" | "sync";
type Patch = Partial<AppState> | ((prev: AppState) => AppState);
type Updater = (patch: Patch) => void;

/* ---------- pure fitness math ---------- */
interface MaintenanceInput {
  weightLb: number;
  heightIn: number;
  age: number;
  sex: Sex;
  activity: Activity;
}
function maintenanceCal({ weightLb, heightIn, age, sex, activity }: MaintenanceInput) {
  const kg = weightLb / 2.2046, cm = heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * age + (sex === "female" ? -161 : 5);
  return Math.round(bmr * (ACTIVITY[activity] || 1.55));
}
// least-squares slope over weight logs -> lb/week
function weeklyRate(weights: WeightEntry[] | undefined): number | null {
  if (!weights || weights.length < 2) return null;
  const pts = [...weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-21)
    .map((w) => ({ t: new Date(w.date).getTime() / 86400000, y: w.lb }));
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.t, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0;
  pts.forEach((p) => { num += (p.t - mx) * (p.y - my); den += (p.t - mx) ** 2; });
  if (den === 0) return null;
  return (num / den) * 7; // lb per week
}
function rollingAvg(weights: WeightEntry[] | undefined, days = 7): number | null {
  if (!weights || !weights.length) return null;
  const cutoff = Date.now() - days * 86400000;
  const recent = weights.filter((w) => new Date(w.date).getTime() >= cutoff);
  const set = recent.length ? recent : weights.slice(-1);
  return set.reduce((s, w) => s + w.lb, 0) / set.length;
}

/* ============================================================================
   WEARABLE PROVIDER  —  the integration hook
   Today: returns mock data so the UI is fully wired.
   Later: replace `sync()` with a real bridge. The shape it returns is the
   contract the whole app depends on — keep these keys and everything works.
   ========================================================================== */
const WearableProvider = {
  name: "Wearable (demo)",
  async connect(): Promise<{ ok: boolean }> {
    // Real impl: request HealthKit / Health Connect / Fitbit OAuth permissions.
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true };
  },
  async sync(currentWeight: number): Promise<WearableMetrics> {
    // Real impl: read today's samples from the health store and normalize to this shape.
    await new Promise((r) => setTimeout(r, 600));
    const jitter = (b: number, s: number) => Math.round(b + (Math.random() - 0.5) * s);
    return {
      steps: jitter(8200, 3000),
      activeCal: jitter(430, 160),   // active energy burned today
      sleepHr: +(6.8 + Math.random() * 1.6).toFixed(1),
      restingHr: jitter(58, 6),
      weight: +(currentWeight + (Math.random() - 0.4) * 0.4).toFixed(1), // synced scale
      syncedAt: new Date().toISOString(),
    };
  },
};

/* ---------- storage ---------- */
const blankState: AppState = {
  profile: null,
  weights: [],
  intake: {},        // { 'YYYY-MM-DD': { cal, protein } }
  workouts: [],      // { date, exercise, weight, reps }
  surplus: 400,
  wearable: { connected: false, metrics: null },
};

function loadState(): AppState | null {
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) return { ...blankState, ...(JSON.parse(raw) as Partial<AppState>) };
    }
  } catch { /* no saved state yet */ }
  return null; // signals "not found"
}
function saveState(state: AppState) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    }
  } catch (e) { console.error("save failed", e); }
}

/* ---------- tiny UI atoms ---------- */
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, ...style }}>
    {children}
  </div>
);
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.gold, fontWeight: 700 }}>
    {children}
  </div>
);
function Ring({ value, target, label, unit, color }:
  { value: number; target: number; label: string; unit?: string; color: string }) {
  const pct = target > 0 ? Math.min(value / target, 1.15) : 0;
  const r = 34, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div style={{ position: "relative", width: 84, height: 84 }}>
        <svg width="84" height="84" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="42" cy="42" r={r} fill="none" stroke={C.line} strokeWidth="7" />
          <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(pct, 1))} strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1 }}>{Math.round(value)}</span>
          <span style={{ fontSize: 9, color: C.muted }}>/ {target}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{label}{unit ? ` (${unit})` : ""}</span>
    </div>
  );
}
const Btn = ({ children, onClick, kind = "gold", style }:
  { children: React.ReactNode; onClick?: () => void; kind?: "gold" | "ghost" | "dark"; style?: React.CSSProperties }) => {
  const base: React.CSSProperties = { border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14,
    padding: "12px 16px", cursor: "pointer", display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 8, width: "100%" };
  const kinds: Record<"gold" | "ghost" | "dark", React.CSSProperties> = {
    gold: { background: C.gold, color: "#14171C" },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
    dark: { background: C.surface2, color: C.text, border: `1px solid ${C.line}` },
  };
  return <button onClick={onClick} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
};
const Field = ({ label, ...props }:
  { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label style={{ display: "block", marginBottom: 12 }}>
    <span style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 5 }}>{label}</span>
    <input {...props} style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`,
      borderRadius: 10, color: C.text, padding: "11px 12px", fontSize: 15, outline: "none" }} />
  </label>
);

/* ============================================================================
   APP
   ========================================================================== */
export default function HealthyGainTracker() {
  const [state, setState] = useState<AppState | null>(null);   // null = loading
  const [tab, setTab] = useState<TabId>("home");
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    if (loaded && loaded.profile) { setState(loaded); }
    else { setState({ ...blankState }); setNeedsSetup(true); }
  }, []);

  const update = useCallback<Updater>((patch) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  if (!state) return <Loading />;
  if (needsSetup || !state.profile)
    return <Setup state={state} onDone={(p) => { update({ profile: p, weights: p._seedWeight
      ? [{ date: todayStr(), lb: p.weightLb }] : state.weights }); setNeedsSetup(false); }} />;

  /* ---- derived numbers ---- */
  const curWeight = rollingAvg(state.weights) ?? state.profile.weightLb;
  const maintenance = maintenanceCal({ ...state.profile, weightLb: curWeight });
  const targetCal = maintenance + state.surplus;
  const proteinTarget = Math.round(curWeight); // ~1 g / lb
  const today = state.intake[todayStr()] || { cal: 0, protein: 0 };
  const rate = weeklyRate(state.weights);

  const shared: Shared = { state, update, curWeight, maintenance, targetCal, proteinTarget, today, rate, setTab };

  const TABS: [TabId, LucideIcon, string][] = [
    ["home", Home, "Home"], ["weight", TrendingUp, "Weight"], ["eat", Utensils, "Eat"],
    ["train", Dumbbell, "Train"], ["sync", Watch, "Sync"],
  ];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", paddingBottom: 88 }}>
        {/* header */}
        <div style={{ padding: "18px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.28em", color: C.gold, fontWeight: 700 }}>HEALTHY GAIN</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em" }}>Tracker</div>
          </div>
          <button onClick={() => setNeedsSetup(true)} style={{ background: C.surface, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: 9, cursor: "pointer", color: C.muted }}>
            <Settings size={18} />
          </button>
        </div>

        <div style={{ padding: "0 18px" }}>
          {tab === "home" && <HomeTab {...shared} />}
          {tab === "weight" && <WeightTab {...shared} />}
          {tab === "eat" && <EatTab {...shared} />}
          {tab === "train" && <TrainTab {...shared} />}
          {tab === "sync" && <SyncTab {...shared} />}
        </div>
      </div>

      {/* bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface,
        borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, width: "100%", display: "flex" }}>
          {TABS.map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: "none", border: "none",
              padding: "10px 0 14px", cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, color: tab === id ? C.gold : C.muted }}>
              <Icon size={21} />
              <span style={{ fontSize: 10, fontWeight: tab === id ? 700 : 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Shared {
  state: AppState;
  update: Updater;
  curWeight: number;
  maintenance: number;
  targetCal: number;
  proteinTarget: number;
  today: DayIntake;
  rate: number | null;
  setTab: (t: TabId) => void;
}

/* ---------- Loading ---------- */
const Loading = () => (
  <div style={{ background: C.bg, color: C.muted, minHeight: "100vh", display: "flex",
    alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
    Loading your data…
  </div>
);

/* ---------- Setup / onboarding ---------- */
interface SetupForm {
  heightIn: number;
  weightLb: number;
  age: number;
  sex: Sex;
  activity: Activity;
  goalLb: number;
}
function Setup({ state, onDone }: { state: AppState; onDone: (p: Profile) => void }) {
  const p = state.profile || ({} as Partial<Profile>);
  const [f, setF] = useState<SetupForm>({
    heightIn: p.heightIn || 67, weightLb: p.weightLb || 150, age: p.age || 30,
    sex: p.sex || "male", activity: p.activity || "moderate", goalLb: p.goalLb || 178,
  });
  const set = <K extends keyof SetupForm>(k: K, v: SetupForm[K]) => setF((s) => ({ ...s, [k]: v }));
  const preview = maintenanceCal(f);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: 22 }}>
        <Eyebrow>Setup</Eyebrow>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 4px", letterSpacing: "-0.01em" }}>
          Your gain profile
        </h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
          Sets your personalized calorie and protein targets. Everything recalculates as you gain.
        </p>

        <Card style={{ marginBottom: 16 }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (in)" type="number" value={f.heightIn}
              onChange={(e) => set("heightIn", +e.target.value)} />
            <Field label="Weight (lb)" type="number" value={f.weightLb}
              onChange={(e) => set("weightLb", +e.target.value)} />
            <Field label="Age" type="number" value={f.age}
              onChange={(e) => set("age", +e.target.value)} />
            <Field label="Goal weight (lb)" type="number" value={f.goalLb}
              onChange={(e) => set("goalLb", +e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6 }}>Sex (for BMR formula)</span>
            <div className="flex gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button key={s} onClick={() => set("sex", s)} style={{ flex: 1, padding: "9px",
                  borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13,
                  background: f.sex === s ? C.goldSoft : C.bg, color: f.sex === s ? C.gold : C.muted,
                  border: `1px solid ${f.sex === s ? C.gold : C.line}`, textTransform: "capitalize" }}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 6 }}>Training activity</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ACTIVITY) as Activity[]).map((a) => (
                <button key={a} onClick={() => set("activity", a)} style={{ padding: "9px 4px",
                  borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 12,
                  background: f.activity === a ? C.goldSoft : C.bg, color: f.activity === a ? C.gold : C.muted,
                  border: `1px solid ${f.activity === a ? C.gold : C.line}`, textTransform: "capitalize" }}>{a}</button>
              ))}
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: 16, background: C.surface2 }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 11, color: C.muted }}>Est. maintenance</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{preview.toLocaleString()} <span style={{ fontSize: 13, color: C.muted }}>cal</span></div>
            </div>
            <ArrowUpRight color={C.gold} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.muted }}>Bulk target (+400)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>{(preview + 400).toLocaleString()}</div>
            </div>
          </div>
        </Card>

        <Btn onClick={() => onDone({ ...f, _seedWeight: !state.weights.length })}>
          <Check size={18} /> Save &amp; start tracking
        </Btn>
      </div>
    </div>
  );
}

/* ---------- HOME ---------- */
function HomeTab({ state, curWeight, maintenance, targetCal, proteinTarget, today, rate, setTab }: Shared) {
  const start = state.weights.length
    ? [...state.weights].sort((a, b) => a.date.localeCompare(b.date))[0].lb
    : state.profile!.weightLb;
  const goal = state.profile!.goalLb;
  const gained = curWeight - start;
  const toGo = goal - curWeight;
  const progPct = Math.max(0, Math.min(1, (curWeight - start) / (goal - start || 1)));

  return (
    <>
      {/* progress to goal */}
      <Card style={{ marginBottom: 14 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <Eyebrow>Progress to goal</Eyebrow>
          <span style={{ fontSize: 12, color: C.muted }}>
            <Trophy size={13} style={{ verticalAlign: -2, marginRight: 4, color: C.gold }} />
            {toGo > 0 ? `${toGo.toFixed(1)} lb to go` : "Goal reached 🎉"}
          </span>
        </div>
        <div className="flex items-end justify-between" style={{ marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{curWeight.toFixed(1)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>current lb (7-day avg)</div>
          </div>
          <div style={{ textAlign: "right", color: gained >= 0 ? C.green : C.muted }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{gained >= 0 ? "+" : ""}{gained.toFixed(1)} lb</div>
            <div style={{ fontSize: 11, color: C.muted }}>since start</div>
          </div>
        </div>
        <div style={{ height: 8, background: C.bg, borderRadius: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progPct * 100}%`, background: C.gold, borderRadius: 20 }} />
        </div>
        <div className="flex justify-between" style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
          <span>{start} lb start</span><span>{goal} lb goal</span>
        </div>
      </Card>

      {/* PACE engine — signature */}
      <PaceCard rate={rate} state={state} />

      {/* today's fuel */}
      <Card style={{ marginTop: 14 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <Eyebrow>Today&apos;s fuel</Eyebrow>
          <button onClick={() => setTab("eat")} style={{ background: "none", border: "none", color: C.gold,
            fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
            Log <Plus size={13} />
          </button>
        </div>
        <div className="flex justify-around">
          <Ring value={today.cal} target={targetCal} label="Calories" color={C.gold} />
          <Ring value={today.protein} target={proteinTarget} label="Protein" unit="g" color={C.green} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, fontSize: 11, color: C.muted }}>
          <div style={{ flex: 1, background: C.bg, borderRadius: 10, padding: "9px 11px" }}>
            <Flame size={13} color={C.gold} /> Maintenance <b style={{ color: C.text }}>{maintenance.toLocaleString()}</b>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 10, padding: "9px 11px" }}>
            <Target size={13} color={C.gold} /> Surplus <b style={{ color: C.text }}>+{state.surplus}</b>
          </div>
        </div>
      </Card>
    </>
  );
}

function PaceCard({ rate }: { rate: number | null; state: AppState }) {
  let status: string, color: string, soft: string, Icon: LucideIcon,
    headline: string, advice: string;
  if (rate == null) {
    status = "Need data"; color = C.muted; soft = C.surface2; Icon = Minus;
    headline = "Log 2+ weigh-ins"; advice = "Add a few days of weight so PACE can read your trend.";
  } else if (rate < 0.25) {
    status = "Too slow"; color = C.gold; soft = C.goldSoft; Icon = ArrowUpRight;
    headline = `${rate >= 0 ? "+" : ""}${rate.toFixed(2)} lb/wk`;
    advice = "Below target. Add 150–200 cal/day, then recheck in 2 weeks.";
  } else if (rate > 0.75) {
    status = "Too fast"; color = C.red; soft = C.redSoft; Icon = ArrowDownRight;
    headline = `+${rate.toFixed(2)} lb/wk`;
    advice = "Gaining too fast (fat risk). Cut 150–200 cal/day.";
  } else {
    status = "On pace"; color = C.green; soft = C.greenSoft; Icon = Check;
    headline = `+${rate.toFixed(2)} lb/wk`;
    advice = "Right in the lean-gain band (+0.35–0.6). Hold steady.";
  }
  return (
    <Card style={{ background: soft, border: `1px solid ${color}` }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Zap size={15} color={color} />
          <span style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, color }}>
            PACE · {status}
          </span>
        </div>
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text }}>{headline}</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{advice}</div>
    </Card>
  );
}

/* ---------- WEIGHT ---------- */
function WeightTab({ state, update, rate }: Shared) {
  const [val, setVal] = useState("");
  const sorted = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.map((w) => ({ date: w.date.slice(5), lb: w.lb }));
  const avg = rollingAvg(state.weights);

  const add = () => {
    const lb = parseFloat(val);
    if (!lb || lb < 50 || lb > 600) return;
    update((prev) => {
      const others = prev.weights.filter((w) => w.date !== todayStr());
      return { ...prev, weights: [...others, { date: todayStr(), lb }] };
    });
    setVal("");
  };

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <Eyebrow>Log weight</Eyebrow>
        <p style={{ fontSize: 11, color: C.muted, margin: "5px 0 12px" }}>
          Same time daily (morning, after bathroom, before food). Today overwrites.
        </p>
        <div className="flex gap-2">
          <input type="number" step="0.1" placeholder="lb" value={val}
            onChange={(e) => setVal(e.target.value)}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12,
              color: C.text, padding: "12px 14px", fontSize: 17, fontWeight: 700, outline: "none" }} />
          <button onClick={add} style={{ background: C.gold, border: "none", borderRadius: 12,
            padding: "0 20px", fontWeight: 700, color: "#14171C", cursor: "pointer", fontSize: 15 }}>
            Add
          </button>
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <Eyebrow>Trend</Eyebrow>
          <div style={{ fontSize: 12, color: C.muted }}>
            7-day avg <b style={{ color: C.text }}>{avg ? avg.toFixed(1) : "–"}</b> ·
            rate <b style={{ color: rate == null ? C.muted : rate < 0.25 ? C.gold : rate > 0.75 ? C.red : C.green }}>
              {rate == null ? " –" : ` ${rate >= 0 ? "+" : ""}${rate.toFixed(2)}/wk`}</b>
          </div>
        </div>
        {chartData.length >= 2 ? (
          <div style={{ height: 200, marginTop: 8, marginLeft: -18 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} stroke={C.line} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: C.muted, fontSize: 10 }}
                  stroke={C.line} width={34} />
                <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`,
                  borderRadius: 10, color: C.text }} labelStyle={{ color: C.muted }} />
                <ReferenceLine y={state.profile!.goalLb} stroke={C.gold} strokeDasharray="4 4"
                  label={{ value: "goal", fill: C.gold, fontSize: 10, position: "insideTopRight" }} />
                <Line type="monotone" dataKey="lb" stroke={C.gold} strokeWidth={2.5}
                  dot={{ r: 3, fill: C.gold }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.muted, fontSize: 13 }}>Add at least 2 weigh-ins to see your trend</div>
        )}
      </Card>
    </>
  );
}

/* ---------- EAT ---------- */
function EatTab({ update, targetCal, proteinTarget, today }: Shared) {
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const key = todayStr();

  const addLog = (c: number, p: number) => update((prev) => {
    const cur = prev.intake[key] || { cal: 0, protein: 0 };
    return { ...prev, intake: { ...prev.intake, [key]: { cal: cur.cal + c, protein: cur.protein + p } } };
  });
  const manual = () => {
    const c = parseInt(cal) || 0, p = parseInt(pro) || 0;
    if (!c && !p) return;
    addLog(c, p); setCal(""); setPro("");
  };
  const reset = () => update((prev) => ({ ...prev, intake: { ...prev.intake, [key]: { cal: 0, protein: 0 } } }));

  const QUICK = [
    { label: "Gainer shake", c: 750, p: 45 },
    { label: "Chicken + rice", c: 700, p: 45 },
    { label: "3 eggs + oats", c: 700, p: 30 },
    { label: "Greek yogurt bowl", c: 350, p: 25 },
    { label: "Whey scoop", c: 130, p: 25 },
    { label: "PB + banana", c: 300, p: 8 },
  ];

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <div className="flex justify-around" style={{ marginBottom: 6 }}>
          <Ring value={today.cal} target={targetCal} label="Calories" color={C.gold} />
          <Ring value={today.protein} target={proteinTarget} label="Protein" unit="g" color={C.green} />
        </div>
        <div className="flex justify-between" style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
          <span>{Math.max(0, targetCal - today.cal)} cal left</span>
          <button onClick={reset} style={{ background: "none", border: "none", color: C.muted,
            fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>reset today</button>
          <span>{Math.max(0, proteinTarget - today.protein)} g protein left</span>
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <Eyebrow>Quick add</Eyebrow>
        <div className="grid grid-cols-2 gap-2" style={{ marginTop: 10 }}>
          {QUICK.map((q) => (
            <button key={q.label} onClick={() => addLog(q.c, q.p)} style={{ textAlign: "left",
              background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
              cursor: "pointer", color: C.text }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{q.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{q.c} cal · {q.p}g P</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow>Manual entry</Eyebrow>
        <div className="flex gap-2" style={{ marginTop: 10 }}>
          <input type="number" placeholder="calories" value={cal} onChange={(e) => setCal(e.target.value)}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10,
              color: C.text, padding: "11px 12px", fontSize: 14, outline: "none" }} />
          <input type="number" placeholder="protein g" value={pro} onChange={(e) => setPro(e.target.value)}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10,
              color: C.text, padding: "11px 12px", fontSize: 14, outline: "none" }} />
          <button onClick={manual} style={{ background: C.surface2, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: "0 16px", color: C.gold, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={18} />
          </button>
        </div>
      </Card>
    </>
  );
}

/* ---------- TRAIN ---------- */
function TrainTab({ state, update }: Shared) {
  const [ex, setEx] = useState("");
  const [wt, setWt] = useState("");
  const [reps, setReps] = useState("");

  const add = () => {
    if (!ex || !wt) return;
    update((prev) => ({ ...prev, workouts: [{ date: todayStr(), exercise: ex.trim(),
      weight: +wt, reps: +reps || 0 }, ...prev.workouts].slice(0, 200) }));
    setWt(""); setReps("");
  };

  // last top set per exercise (for progressive-overload glance)
  const bests = useMemo(() => {
    const m: Record<string, Workout> = {};
    [...state.workouts].sort((a, b) => b.date.localeCompare(a.date)).forEach((w) => {
      if (!m[w.exercise]) m[w.exercise] = w;
    });
    return Object.values(m);
  }, [state.workouts]);

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <Eyebrow>Log a top set</Eyebrow>
        <p style={{ fontSize: 11, color: C.muted, margin: "5px 0 12px" }}>
          Your heaviest working set. Beat last time = progressive overload = growth.
        </p>
        <input placeholder="Exercise (e.g. Bench Press)" value={ex} onChange={(e) => setEx(e.target.value)}
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10,
            color: C.text, padding: "11px 12px", fontSize: 14, outline: "none", marginBottom: 10 }} />
        <div className="flex gap-2">
          <input type="number" placeholder="weight" value={wt} onChange={(e) => setWt(e.target.value)}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10,
              color: C.text, padding: "11px 12px", fontSize: 14, outline: "none" }} />
          <input type="number" placeholder="reps" value={reps} onChange={(e) => setReps(e.target.value)}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10,
              color: C.text, padding: "11px 12px", fontSize: 14, outline: "none" }} />
          <button onClick={add} style={{ background: C.gold, border: "none", borderRadius: 10,
            padding: "0 18px", fontWeight: 700, color: "#14171C", cursor: "pointer" }}>Log</button>
        </div>
      </Card>

      <Card>
        <Eyebrow>Current bests</Eyebrow>
        {bests.length ? (
          <div style={{ marginTop: 10 }}>
            {bests.map((b) => (
              <div key={b.exercise} className="flex items-center justify-between"
                style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{b.exercise}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{b.date}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>
                  {b.weight}<span style={{ fontSize: 12, color: C.muted }}> × {b.reps}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>No lifts logged yet.</div>
        )}
      </Card>
    </>
  );
}

/* ---------- SYNC (wearable) ---------- */
function SyncTab({ state, update, curWeight }: Shared) {
  const [busy, setBusy] = useState(false);
  const w = state.wearable;

  const connect = async () => {
    setBusy(true);
    const res = await WearableProvider.connect();
    if (res.ok) update((prev) => ({ ...prev, wearable: { ...prev.wearable, connected: true } }));
    setBusy(false);
  };
  const sync = async () => {
    setBusy(true);
    const m = await WearableProvider.sync(curWeight);
    update((prev) => {
      // synced scale weight flows into the weight log automatically
      const others = prev.weights.filter((x) => x.date !== todayStr());
      const weights = m.weight ? [...others, { date: todayStr(), lb: m.weight }] : prev.weights;
      return { ...prev, weights, wearable: { connected: true, metrics: m } };
    });
    setBusy(false);
  };
  const disconnect = () => update((prev) => ({ ...prev, wearable: { connected: false, metrics: null } }));

  const metricRows: { Icon: LucideIcon; label: string; val: string }[] =
    w.metrics ? [
      { Icon: Footprints, label: "Steps", val: w.metrics.steps.toLocaleString() },
      { Icon: Flame, label: "Active energy", val: `${w.metrics.activeCal} cal` },
      { Icon: Moon, label: "Sleep", val: `${w.metrics.sleepHr} hr` },
      { Icon: TrendingUp, label: "Resting HR", val: `${w.metrics.restingHr} bpm` },
    ] : [];

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <Eyebrow>Wearable</Eyebrow>
        {!w.connected ? (
          <>
            <p style={{ fontSize: 13, color: C.muted, margin: "8px 0 14px", lineHeight: 1.5 }}>
              Connect a device to pull steps, active energy, sleep, and scale weight automatically.
              Works offline; syncs when connected.
            </p>
            <Btn onClick={connect} kind="gold">
              {busy ? <RefreshCw size={17} className="animate-spin" /> : <Link2 size={17} />}
              {busy ? "Connecting…" : "Connect device"}
            </Btn>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between" style={{ margin: "10px 0 14px" }}>
              <span style={{ fontSize: 13, color: C.green, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: C.green, display: "inline-block" }} />
                Connected
              </span>
              {w.metrics && <span style={{ fontSize: 11, color: C.muted }}>
                synced {new Date(w.metrics.syncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
            <Btn onClick={sync} kind="gold" style={{ marginBottom: 8 }}>
              {busy ? <RefreshCw size={17} className="animate-spin" /> : <RefreshCw size={17} />}
              {busy ? "Syncing…" : "Sync now"}
            </Btn>
            <Btn onClick={disconnect} kind="ghost">Disconnect</Btn>
          </>
        )}
      </Card>

      {w.metrics && (
        <Card style={{ marginBottom: 14 }}>
          <Eyebrow>Today from device</Eyebrow>
          <div className="grid grid-cols-2 gap-2" style={{ marginTop: 10 }}>
            {metricRows.map(({ Icon, label, val }) => (
              <div key={label} style={{ background: C.bg, borderRadius: 12, padding: "12px 13px" }}>
                <Icon size={16} color={C.gold} />
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{val}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
            Scale weight auto-added to your log. Active energy can refine your maintenance estimate
            on days you move more.
          </div>
        </Card>
      )}

      <Card style={{ background: C.surface2 }}>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
          <b style={{ color: C.text }}>Developer note:</b> this screen runs on a <code style={{ color: C.gold }}>WearableProvider</code> abstraction.
          It uses demo data now. Swap the <code style={{ color: C.gold }}>connect()</code> and <code style={{ color: C.gold }}>sync()</code> methods
          for Apple HealthKit, Android Health Connect, Fitbit, or Garmin — the return shape is the only contract, so nothing else changes.
        </div>
      </Card>
    </>
  );
}
