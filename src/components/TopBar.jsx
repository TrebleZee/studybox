import { fmtDur } from "../utils/format.js";
import { freezeStats } from "../utils/gameLogic.js";
import ExamCountdown from "./ExamCountdown.jsx";

const VIEWS = [
  ["planner", "Planner"],
  ["log", "Log"],
  ["analysis", "Analysis"],
  ["settings", "Settings"],
];

export default function TopBar({ C, view, onChangeView, game, grandTotal, subjects = [] }) {
  const { available: freezesAvailable, xpToNext: xpToNextFreeze } = freezeStats(game);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        height: "46px",
        borderBottom: `1px solid ${C.bdr}`,
        background: C.s1,
        gap: "3px",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: "14px",
          letterSpacing: "-0.3px",
          marginRight: "10px",
          color: C.txt,
        }}
      >
        StudyBox
      </span>
      {VIEWS.map(([v, label]) => (
        <button
          key={v}
          className="nb"
          onClick={() => onChangeView(v)}
          style={{
            padding: "5px 11px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 500,
            background: view === v ? C.s3 : "transparent",
            color: view === v ? C.txt : C.muted,
            transition: "background 0.1s",
          }}
        >
          {label}
        </button>
      ))}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "11px",
        }}
      >
        <ExamCountdown C={C} subjects={subjects} onClick={() => onChangeView("analysis")} />

        <button
          type="button"
          className="nb"
          onClick={() => onChangeView("analysis")}
          title={`Current streak: ${game.currentStreak} day(s)`}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            fontWeight: 600,
            color: C.txt,
            padding: "2px 4px",
            borderRadius: "4px",
          }}
        >
          <span>🔥 {game.currentStreak}d</span>
          {freezesAvailable > 0 && <span title={`${freezesAvailable} freeze(s) available`}>❄️</span>}
        </button>

        <button
          type="button"
          className="nb"
          onClick={() => onChangeView("analysis")}
          title={`Total XP: ${game.totalXP} XP (${freezesAvailable === 3 ? "Freeze slot full" : `${xpToNextFreeze} XP to next freeze`})`}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            color: C.muted,
            padding: "2px 4px",
            borderRadius: "4px",
          }}
        >
          <span>⚡ {game.totalXP} XP</span>
        </button>

        <button
          type="button"
          className="nb"
          onClick={() => onChangeView("analysis")}
          title={`Streak freezes: ${freezesAvailable}/3 available`}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            color: C.muted,
            padding: "2px 4px",
            borderRadius: "4px",
          }}
        >
          <span>❄️ {freezesAvailable}/3</span>
        </button>

        <span style={{ fontSize: "11px", color: C.muted, borderLeft: `1px solid ${C.bdr2}`, paddingLeft: "8px" }}>
          {grandTotal > 0 ? fmtDur(grandTotal) : "0m"} total
        </span>
      </div>
    </div>
  );
}
