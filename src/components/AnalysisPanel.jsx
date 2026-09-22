import { useState, useMemo } from "react";
import { inTierTopics } from "../utils/subjects.js";

// Helper duration formatters
const fmtDur = (s) => {
  if (!s || s <= 0) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

const fmtHours = (s) => {
  if (!s || s <= 0) return "0h";
  const h = (s / 3600).toFixed(1);
  return `${h.endsWith(".0") ? Math.round(s / 3600) : h}h`;
};

// Date helpers
const parseDate = (dStr) => {
  if (!dStr) return null;
  const d = new Date(dStr);
  return isNaN(d.getTime()) ? null : d;
};

const toYYYYMMDD = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getMonToSunIndex = (d) => {
  const day = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  return (day + 6) % 7; // 0 = Mon, 1 = Tue ... 6 = Sun
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function AnalysisPanel({
  subjects,
  sessions,
  asanaCfg,
  asanaStats,
  game,
  C,
}) {
  const [timeframe, setTimeframe] = useState("all"); // 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");

  const freezesEarned = Math.floor((game?.totalXP || 0) / 500);
  const freezesAvailable = Math.min(Math.max(0, freezesEarned - (game?.freezesUsed || 0)), 3);
  const xpToNextFreeze = 500 - ((game?.totalXP || 0) % 500);
  const currentStreak = game?.currentStreak ?? 0;
  const longestStreak = game?.longestStreak ?? 0;

  // All combined subjects including Asana if it has logged sessions or stats
  const allSubjects = useMemo(() => {
    const list = [...subjects];
    const hasAsanaSessions = sessions.some((s) => s.subjectId === asanaCfg?.id);
    if (hasAsanaSessions || (asanaStats && asanaStats.total > 0)) {
      list.push({
        id: asanaCfg.id,
        name: asanaCfg.name,
        exam: asanaCfg.exam || "Asana",
        color: asanaCfg.color || "#F06595",
        topics: [],
        isAsana: true,
      });
    }
    return list;
  }, [subjects, sessions, asanaCfg, asanaStats]);

  // Filtered sessions by subject if subject filter is active
  const filteredSessions = useMemo(() => {
    if (selectedSubjectFilter === "all") return sessions;
    return sessions.filter((s) => s.subjectId === selectedSubjectFilter);
  }, [sessions, selectedSubjectFilter]);

  // Total Study Duration for current subject filter
  const totalStudySecs = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  }, [filteredSessions]);

  // Per Subject Totals & Percentages
  const subjectStats = useMemo(() => {
    const totals = {};
    const sessionCounts = {};

    allSubjects.forEach((sub) => {
      totals[sub.id] = 0;
      sessionCounts[sub.id] = 0;
    });

    filteredSessions.forEach((s) => {
      if (totals[s.subjectId] !== undefined) {
        totals[s.subjectId] += s.duration || 0;
        sessionCounts[s.subjectId] += 1;
      } else {
        totals[s.subjectId] = (totals[s.subjectId] || 0) + (s.duration || 0);
        sessionCounts[s.subjectId] = (sessionCounts[s.subjectId] || 0) + 1;
      }
    });

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    return allSubjects.map((sub) => {
      const dur = totals[sub.id] || 0;
      const count = sessionCounts[sub.id] || 0;
      const pct = grandTotal > 0 ? Math.round((dur / grandTotal) * 100) : 0;
      const avgLengthSecs = count > 0 ? Math.round(dur / count) : 0;

      const [doneTopics, totalTopics] = sub.isAsana
        ? [asanaStats?.completed || 0, asanaStats?.total || 0]
        : [inTierTopics(sub).filter((t) => t.done).length, inTierTopics(sub).length];

      const topicPct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

      return {
        ...sub,
        durationSecs: dur,
        sessionCount: count,
        pct,
        avgLengthSecs,
        doneTopics,
        totalTopics,
        topicPct,
        untouchedTopics: sub.isAsana ? [] : inTierTopics(sub).filter((t) => !t.done),
      };
    });
  }, [allSubjects, filteredSessions, asanaStats]);

  // Imbalance Insight
  const imbalanceInsight = useMemo(() => {
    if (totalStudySecs === 0) return "No study sessions logged yet.";
    const highest = [...subjectStats].sort((a, b) => b.pct - a.pct)[0];
    const lowest = [...subjectStats]
      .filter((s) => s.totalTopics > 0 || s.durationSecs > 0)
      .sort((a, b) => a.pct - b.pct)[0];

    if (highest && highest.pct >= 50) {
      return `Imbalance Alert: ${highest.name} accounts for ${highest.pct}% of all logged study time.`;
    }
    if (lowest && lowest.pct <= 10 && subjectStats.length > 1) {
      return `Under-invested: ${lowest.name} accounts for only ${lowest.pct}% of study time.`;
    }
    return `Balanced Distribution: Study time is evenly spread across your subjects.`;
  }, [subjectStats, totalStudySecs]);

  // Breakdown of Today, This Week, This Month, This Year, and All Time
  const timeProgressStats = useMemo(() => {
    const todayObj = new Date();
    const todayKey = toYYYYMMDD(todayObj);

    const currentMonToSun = getMonToSunIndex(todayObj);
    const monOfThisWeek = new Date(todayObj);
    monOfThisWeek.setDate(monOfThisWeek.getDate() - currentMonToSun);
    monOfThisWeek.setHours(0, 0, 0, 0);

    const currentYear = todayObj.getFullYear();
    const currentMonth = todayObj.getMonth();

    let todaySecs = 0, todaySessions = 0;
    const todaySubjects = {};

    let weekSecs = 0, weekSessions = 0;
    const weekSubjects = {};

    let monthSecs = 0, monthSessions = 0;
    const monthSubjects = {};

    let yearSecs = 0, yearSessions = 0;
    const yearSubjects = {};

    let allSecs = 0, allSessions = 0;
    const allSubjectsMap = {};

    allSubjects.forEach((sub) => {
      todaySubjects[sub.id] = 0;
      weekSubjects[sub.id] = 0;
      monthSubjects[sub.id] = 0;
      yearSubjects[sub.id] = 0;
      allSubjectsMap[sub.id] = 0;
    });

    filteredSessions.forEach((s) => {
      const d = parseDate(s.date);
      if (!d) return;

      const dur = s.duration || 0;
      const subId = s.subjectId;

      allSecs += dur;
      allSessions += 1;
      if (allSubjectsMap[subId] !== undefined) allSubjectsMap[subId] += dur;

      if (toYYYYMMDD(d) === todayKey) {
        todaySecs += dur;
        todaySessions += 1;
        if (todaySubjects[subId] !== undefined) todaySubjects[subId] += dur;
      }

      if (d >= monOfThisWeek) {
        weekSecs += dur;
        weekSessions += 1;
        if (weekSubjects[subId] !== undefined) weekSubjects[subId] += dur;
      }

      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        monthSecs += dur;
        monthSessions += 1;
        if (monthSubjects[subId] !== undefined) monthSubjects[subId] += dur;
      }

      if (d.getFullYear() === currentYear) {
        yearSecs += dur;
        yearSessions += 1;
        if (yearSubjects[subId] !== undefined) yearSubjects[subId] += dur;
      }
    });

    return {
      today: { secs: todaySecs, sessions: todaySessions, subjects: todaySubjects },
      week: { secs: weekSecs, sessions: weekSessions, subjects: weekSubjects },
      month: { secs: monthSecs, sessions: monthSessions, subjects: monthSubjects },
      year: { secs: yearSecs, sessions: yearSessions, subjects: yearSubjects },
      all: { secs: allSecs, sessions: allSessions, subjects: allSubjectsMap },
    };
  }, [filteredSessions, allSubjects]);

  // 1. Last 7 Days Daily Breakdown (for 'daily' view)
  const last7DaysData = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toYYYYMMDD(d);

      let daySecs = 0;
      filteredSessions.forEach((s) => {
        const sd = parseDate(s.date);
        if (sd && toYYYYMMDD(sd) === key) {
          daySecs += s.duration || 0;
        }
      });

      const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : `${DAY_NAMES[getMonToSunIndex(d)]} ${d.getDate()}`;
      days.push({
        date: d,
        key,
        label,
        secs: daySecs,
        hours: daySecs / 3600,
        isToday: i === 0,
      });
    }

    const maxHours = Math.max(...days.map((d) => d.hours), 1);
    return { days, maxHours };
  }, [filteredSessions]);

  // 2. Day-of-Week Breakdown (General Mon-Sun)
  const dayOfWeekPatterns = useMemo(() => {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];

    filteredSessions.forEach((s) => {
      const d = parseDate(s.date);
      if (d) {
        const idx = getMonToSunIndex(d);
        dayTotals[idx] += s.duration || 0;
      }
    });

    const maxDaySecs = Math.max(...dayTotals, 1);
    let maxIdx = 0, minIdx = 0;

    dayTotals.forEach((val, idx) => {
      if (val > dayTotals[maxIdx]) maxIdx = idx;
      if (val < dayTotals[minIdx]) minIdx = idx;
    });

    return {
      dayTotals,
      maxDaySecs,
      peakDayName: DAY_NAMES[maxIdx],
      peakHours: fmtHours(dayTotals[maxIdx]),
      quietDayName: DAY_NAMES[minIdx],
      quietHours: fmtHours(dayTotals[minIdx]),
    };
  }, [filteredSessions]);

  // 3. Weekly Trend Data (8-10 Weeks vs Monthly 4-5 Weeks)
  const weeklyTrendData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    const currentMonToSun = getMonToSunIndex(today);
    const endOfThisWeek = new Date(today);
    endOfThisWeek.setDate(endOfThisWeek.getDate() + (6 - currentMonToSun));

    const numWeeks = timeframe === "monthly" ? 5 : 10;

    for (let i = numWeeks - 1; i >= 0; i--) {
      const wEnd = new Date(endOfThisWeek);
      wEnd.setDate(wEnd.getDate() - i * 7);

      const wStart = new Date(wEnd);
      wStart.setDate(wStart.getDate() - 6);

      let weekTotalSecs = 0;
      filteredSessions.forEach((s) => {
        const d = parseDate(s.date);
        if (d && d >= wStart && d <= new Date(wEnd.getFullYear(), wEnd.getMonth(), wEnd.getDate(), 23, 59, 59)) {
          weekTotalSecs += s.duration || 0;
        }
      });

      const label = i === 0 ? "This Wk" : `${wStart.getDate()} ${MONTH_NAMES[wStart.getMonth()]}`;
      weeks.push({
        label,
        totalSecs: weekTotalSecs,
        totalHours: weekTotalSecs / 3600,
        isCurrent: i === 0,
      });
    }

    const maxWeekHours = Math.max(...weeks.map((w) => w.totalHours), 1);
    return { weeks, maxWeekHours };
  }, [filteredSessions, timeframe]);

  // 4. Study Consistency Heatmap Data (Month vs Year vs All)
  const heatmapGrid = useMemo(() => {
    const dailyMap = {};
    filteredSessions.forEach((s) => {
      const d = parseDate(s.date);
      if (d) {
        const key = toYYYYMMDD(d);
        dailyMap[key] = (dailyMap[key] || 0) + (s.duration || 0);
      }
    });

    const todayObj = new Date();
    const endOfWeek = new Date(todayObj);
    const dayOfWeek = getMonToSunIndex(endOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + (6 - dayOfWeek));

    const WEEKS_COUNT = timeframe === "monthly" ? 5 : timeframe === "yearly" ? 52 : 16;
    const TOTAL_CELLS = WEEKS_COUNT * 7;
    const gridDays = [];

    for (let i = TOTAL_CELLS - 1; i >= 0; i--) {
      const cellDate = new Date(endOfWeek);
      cellDate.setDate(cellDate.getDate() - i);
      const key = toYYYYMMDD(cellDate);
      const secs = dailyMap[key] || 0;
      gridDays.push({
        date: cellDate,
        dateKey: key,
        secs,
        hours: secs / 3600,
        dayOfWeek: getMonToSunIndex(cellDate),
      });
    }

    return { gridDays, weeksCount: WEEKS_COUNT };
  }, [filteredSessions, timeframe]);

  // 5. Monthly Hours for Yearly View
  const monthlyTrendData = useMemo(() => {
    const months = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    for (let m = 0; m < 12; m++) {
      let monthSecs = 0;
      filteredSessions.forEach((s) => {
        const d = parseDate(s.date);
        if (d && d.getFullYear() === currentYear && d.getMonth() === m) {
          monthSecs += s.duration || 0;
        }
      });
      months.push({
        label: MONTH_NAMES[m],
        secs: monthSecs,
        hours: monthSecs / 3600,
        isCurrent: m === today.getMonth(),
      });
    }

    const maxMonthHours = Math.max(...months.map((m) => m.hours), 1);
    return { months, maxMonthHours, year: currentYear };
  }, [filteredSessions]);

  // 6. Needs Attention Metric
  const needsAttentionRank = useMemo(() => {
    const maxDur = Math.max(...subjectStats.map((s) => s.durationSecs), 1);

    return [...subjectStats]
      .map((sub) => {
        const topicIncompletion = sub.totalTopics > 0 ? (sub.totalTopics - sub.doneTopics) / sub.totalTopics : 0.5;
        const timeDeficit = 1 - (sub.durationSecs / maxDur);
        const score = Math.round(topicIncompletion * 60 + timeDeficit * 40);

        let priority = "Low";
        let color = "#34D399";
        if (score >= 65) {
          priority = "High";
          color = "#EF4444";
        } else if (score >= 40) {
          priority = "Medium";
          color = "#F59E0B";
        }

        let reason;
        if (sub.topicPct < 40 && sub.pct < 20) {
          reason = `Behind on topics (${sub.topicPct}%) and low time investment (${sub.pct}% share)`;
        } else if (sub.topicPct < 50) {
          reason = `${sub.totalTopics - sub.doneTopics} topics remaining to cover`;
        } else if (sub.pct < 15) {
          reason = `Low study time logged (${fmtDur(sub.durationSecs)})`;
        } else {
          reason = `Good balance across time and topics`;
        }

        return { ...sub, score, priority, color, reason };
      })
      .sort((a, b) => b.score - a.score);
  }, [subjectStats]);

  // 7. Timeframe Breakdown Table Rows
  const breakdownTables = useMemo(() => {
    const grouped = {};

    sessions.forEach((s) => {
      if (selectedSubjectFilter !== "all" && s.subjectId !== selectedSubjectFilter) return;

      const d = parseDate(s.date);
      if (!d) return;

      let key;
      let label;

      if (timeframe === "daily") {
        key = toYYYYMMDD(d);
        label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      } else if (timeframe === "weekly") {
        const monIndex = getMonToSunIndex(d);
        const wStart = new Date(d);
        wStart.setDate(wStart.getDate() - monIndex);
        key = toYYYYMMDD(wStart);
        label = `Wk of ${wStart.getDate()} ${MONTH_NAMES[wStart.getMonth()]}`;
      } else if (timeframe === "monthly") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      } else if (timeframe === "yearly") {
        key = `${d.getFullYear()}`;
        label = `${d.getFullYear()}`;
      } else {
        key = "all";
        label = "All Time";
      }

      if (!grouped[key]) {
        grouped[key] = { key, label, totalSecs: 0, subjects: {} };
        allSubjects.forEach((sub) => (grouped[key].subjects[sub.id] = 0));
      }

      if (grouped[key].subjects[s.subjectId] !== undefined) {
        grouped[key].subjects[s.subjectId] += s.duration || 0;
      }
      grouped[key].totalSecs += s.duration || 0;
    });

    return Object.values(grouped).sort((a, b) => b.key.localeCompare(a.key));
  }, [sessions, timeframe, allSubjects, selectedSubjectFilter]);

  // Helper render method for tab-specific Progress Box
  const renderProgressBox = (periodKey, titleLabel) => {
    const data = timeProgressStats[periodKey] || { secs: 0, sessions: 0, subjects: {} };
    return (
      <div
        style={{
          background: C.s1,
          padding: "18px",
          borderRadius: "10px",
          border: `1px solid ${C.bdr}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {titleLabel}
            </span>
            <span style={{ fontSize: "10px", color: C.muted }}>
              {data.sessions} session{data.sessions !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: C.txt }}>
            {fmtDur(data.secs)}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "12px" }}>
          {allSubjects
            .filter((sub) => (data.subjects[sub.id] || 0) > 0)
            .map((sub) => (
              <span
                key={sub.id}
                style={{
                  fontSize: "10px",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: C.s2,
                  color: sub.color,
                  border: `1px solid ${C.bdr2}`,
                  fontWeight: 600,
                }}
              >
                {sub.name}: {fmtDur(data.subjects[sub.id])}
              </span>
            ))}
          {data.secs === 0 && (
            <span style={{ fontSize: "11px", color: C.muted, fontStyle: "italic" }}>
              No study logged for this period yet
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: C.bg }}>
      {/* Header & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: C.txt }}>
            Study Analysis
          </h1>
          <p style={{ fontSize: "12px", color: C.muted, margin: "3px 0 0" }}>
            Tailored view for {timeframe === "all" ? "All Time" : timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} study metrics
            {selectedSubjectFilter !== "all" ? ` · ${allSubjects.find((s) => s.id === selectedSubjectFilter)?.name || "Filtered"}` : ""}.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Timeframe Filter Buttons */}
          <div
            style={{
              display: "flex",
              background: C.s1,
              padding: "3px",
              borderRadius: "8px",
              border: `1px solid ${C.bdr}`,
            }}
          >
            {[
              ["all", "All Time"],
              ["daily", "Daily"],
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
              ["yearly", "Yearly"],
            ].map(([tfKey, label]) => (
              <button
                key={tfKey}
                className="nb"
                type="button"
                onClick={() => setTimeframe(tfKey)}
                style={{
                  padding: "5px 11px",
                  borderRadius: "5px",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: timeframe === tfKey ? C.s3 : "transparent",
                  color: timeframe === tfKey ? C.txt : C.muted,
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: `1px solid ${C.bdr2}`,
              background: C.s1,
              color: C.txt,
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <option value="all">All Subjects</option>
            {allSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Streaks & Gamification Strip (ALWAYS SHOWN - FIXED ROW) */}
      <div
        style={{
          background: C.s1,
          padding: "14px 18px",
          borderRadius: "10px",
          border: `1px solid ${C.bdr}`,
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "28px" }}>🔥</div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: C.txt }}>
              {currentStreak} Day Streak {freezesAvailable > 0 ? "❄️" : ""}
            </div>
            <div style={{ fontSize: "11px", color: C.muted }}>
              All-time longest streak: {longestStreak} days 🏆
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: "220px", maxWidth: "340px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
            <span style={{ fontWeight: 700, color: C.txt }}>⚡ {game?.totalXP || 0} Total XP</span>
            <span style={{ color: C.muted }}>
              {freezesAvailable === 3 ? "Freeze slot full" : `${xpToNextFreeze} XP to next freeze`}
            </span>
          </div>
          <div
            style={{
              height: "6px",
              background: C.s2,
              borderRadius: "3px",
              overflow: "hidden",
              border: `1px solid ${C.bdr2}`,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${freezesAvailable === 3 ? 100 : Math.round(((500 - xpToNextFreeze) / 500) * 100)}%`,
                background: "#F59E0B",
                borderRadius: "3px",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "24px" }}>❄️</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: C.txt }}>
              {freezesAvailable} / 3 Freezes
            </div>
            <div style={{ fontSize: "11px", color: C.muted }}>
              {game?.freezesUsed || 0} used lifetime (1 per 500 XP)
            </div>
          </div>
        </div>
      </div>

      {/* TAILORED VIEW: DAILY (Today Progress Box on SAME row as Hours per day & Day-of-week) */}
      {timeframe === "daily" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          {/* Today Box */}
          {renderProgressBox("today", "Today (So Far)")}

          {/* Last 7 Days (Hours Per Day) */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Hours Per Day (Last 7 Days)
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Daily study hours over the past week</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", height: "140px", gap: "8px", paddingTop: "10px" }}>
              {last7DaysData.days.map((d) => {
                const heightPct = Math.round((d.hours / last7DaysData.maxHours) * 100);
                return (
                  <div key={d.key} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: "10px", color: C.muted, marginBottom: "4px" }}>
                      {d.hours > 0 ? fmtHours(d.secs) : "-"}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "28px",
                        height: `${Math.max(heightPct, 4)}%`,
                        borderRadius: "4px 4px 0 0",
                        background: d.isToday ? "#34D399" : d.hours > 0 ? "#4F9CF9" : C.s2,
                        border: d.hours === 0 ? `1px dashed ${C.bdr2}` : "none",
                      }}
                      title={`${d.label}: ${fmtHours(d.secs)}`}
                    />
                    <div style={{ fontSize: "9px", color: d.isToday ? C.txt : C.muted, fontWeight: d.isToday ? 700 : 400, marginTop: "6px" }}>
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* General Day-of-Week Breakdown */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Day-of-Week Pattern (In General)
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Cumulative hours spent per weekday</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", height: "140px", gap: "8px", paddingTop: "10px" }}>
              {DAY_NAMES.map((dayName, idx) => {
                const secs = dayOfWeekPatterns.dayTotals[idx];
                const heightPct = Math.round((secs / dayOfWeekPatterns.maxDaySecs) * 100);
                return (
                  <div key={dayName} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: "10px", color: C.muted, marginBottom: "4px" }}>
                      {secs > 0 ? fmtHours(secs) : "-"}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "28px",
                        height: `${Math.max(heightPct, 4)}%`,
                        borderRadius: "4px 4px 0 0",
                        background: idx === 6 || idx === 0 ? "#A78BFA" : "#4F9CF9",
                      }}
                      title={`${dayName}: ${fmtHours(secs)}`}
                    />
                    <div style={{ fontSize: "9px", color: C.muted, marginTop: "6px" }}>{dayName}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session Patterns */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}`, gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Average Session Length per Subject
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Insight into your focus duration</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              {subjectStats.map((sub) => (
                <div key={sub.id} style={{ padding: "10px 12px", borderRadius: "8px", background: C.s2, border: `1px solid ${C.bdr2}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: C.txt }}>{sub.name}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: sub.color }}>
                    {sub.avgLengthSecs ? fmtDur(sub.avgLengthSecs) : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAILORED VIEW: WEEKLY (This Week Progress Box on SAME row as Weekly trend) */}
      {timeframe === "weekly" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          {/* This Week Box */}
          {renderProgressBox("week", "This Week (So Far)")}

          {/* Weekly Trend */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Weekly Trend (Hours per Week)
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Exam prep momentum over past 10 weeks</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", height: "150px", gap: "8px", paddingTop: "10px" }}>
              {weeklyTrendData.weeks.map((wk, idx) => {
                const heightPct = Math.round((wk.totalHours / weeklyTrendData.maxWeekHours) * 100);
                return (
                  <div key={idx} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: "10px", color: C.muted, marginBottom: "4px" }}>
                      {wk.totalHours > 0 ? `${wk.totalHours.toFixed(1)}h` : "-"}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "28px",
                        height: `${Math.max(heightPct, 4)}%`,
                        borderRadius: "4px 4px 0 0",
                        background: wk.isCurrent ? "#4F9CF9" : wk.totalHours > 0 ? C.bdr2 : C.s2,
                        border: wk.totalHours === 0 ? `1px dashed ${C.bdr2}` : "none",
                      }}
                      title={`${wk.label}: ${wk.totalHours.toFixed(1)}h`}
                    />
                    <div
                      style={{
                        fontSize: "8.5px",
                        color: wk.isCurrent ? C.txt : C.muted,
                        fontWeight: wk.isCurrent ? 700 : 400,
                        marginTop: "6px",
                        width: "100%",
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={wk.label}
                    >
                      {wk.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Needs Attention */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Needs Attention
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Low time & topic completion priority</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {needsAttentionRank.slice(0, 3).map((item, idx) => (
                <div key={item.id} style={{ padding: "10px 12px", borderRadius: "8px", background: C.s2, border: `1px solid ${C.bdr2}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: item.color }}>#{idx + 1} {item.name}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: item.color }}>{item.priority} Priority</span>
                  </div>
                  <div style={{ fontSize: "11px", color: C.txt }}>{item.reason}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Coverage Gaps */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}`, gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Topic Coverage Gaps
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Specific untouched topics per subject</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
              {subjectStats.map((sub) => (
                <div key={sub.id} style={{ padding: "10px 12px", borderRadius: "8px", background: C.s2, border: `1px solid ${C.bdr2}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: C.txt, marginBottom: "6px" }}>
                    <span>{sub.name}</span>
                    <span style={{ fontSize: "11px", color: C.muted }}>{sub.doneTopics}/{sub.totalTopics} done</span>
                  </div>
                  {!sub.isAsana && sub.untouchedTopics.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {sub.untouchedTopics.slice(0, 3).map((t) => (
                        <span key={t.id} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: C.s1, color: C.txt }}>
                          ⚠️ {t.name}
                        </span>
                      ))}
                      {sub.untouchedTopics.length > 3 && (
                        <span style={{ fontSize: "10px", color: C.muted }}>+{sub.untouchedTopics.length - 3} more</span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: "10px", color: "#34D399" }}>🎉 Complete</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAILORED VIEW: MONTHLY (This Month Progress Box on SAME row as Weekly trend in month) */}
      {timeframe === "monthly" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          {/* This Month Box */}
          {renderProgressBox("month", "This Month (So Far)")}

          {/* Weekly Trend in Month */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Weekly Trend in Month
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Hours logged per week across recent weeks</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", height: "140px", gap: "8px", paddingTop: "10px" }}>
              {weeklyTrendData.weeks.map((wk, idx) => {
                const heightPct = Math.round((wk.totalHours / weeklyTrendData.maxWeekHours) * 100);
                return (
                  <div key={idx} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: "10px", color: C.muted, marginBottom: "4px" }}>
                      {wk.totalHours > 0 ? `${wk.totalHours.toFixed(1)}h` : "-"}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "32px",
                        height: `${Math.max(heightPct, 4)}%`,
                        borderRadius: "4px 4px 0 0",
                        background: wk.isCurrent ? "#4F9CF9" : C.bdr2,
                      }}
                      title={`${wk.label}: ${wk.totalHours.toFixed(1)}h`}
                    />
                    <div
                      style={{
                        fontSize: "8.5px",
                        color: wk.isCurrent ? C.txt : C.muted,
                        fontWeight: wk.isCurrent ? 700 : 400,
                        marginTop: "6px",
                        width: "100%",
                        textAlign: "center",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={wk.label}
                    >
                      {wk.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Study Consistency in Month */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Study Consistency in Month
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>5-week monthly contribution grid</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[0, 1, 2, 3, 4, 5, 6].map((dayRowIdx) => (
                <div key={dayRowIdx} style={{ display: "grid", gridTemplateColumns: "20px repeat(5, 1fr)", gap: "4px", alignItems: "center" }}>
                  <div style={{ fontSize: "9px", color: C.muted }}>{dayRowIdx % 2 === 0 ? DAY_NAMES[dayRowIdx].slice(0, 1) : ""}</div>
                  {Array.from({ length: 5 }).map((_, colWkIdx) => {
                    const cellIndex = colWkIdx * 7 + dayRowIdx;
                    const cell = heatmapGrid.gridDays[cellIndex];
                    if (!cell) return <div key={colWkIdx} />;
                    const hrs = cell.hours;
                    let bg = C.s2;
                    if (hrs > 4) bg = "#34D399";
                    else if (hrs > 2) bg = "rgba(52, 211, 153, 0.75)";
                    else if (hrs > 0.5) bg = "rgba(52, 211, 153, 0.5)";
                    else if (hrs > 0) bg = "rgba(52, 211, 153, 0.25)";

                    return (
                      <div
                        key={colWkIdx}
                        title={`${toYYYYMMDD(cell.date)}: ${hrs > 0 ? fmtDur(cell.secs) : "No study"}`}
                        style={{ height: "18px", borderRadius: "3px", background: bg, border: `1px solid ${hrs > 0 ? "rgba(52, 211, 153, 0.3)" : C.bdr}` }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Time Distribution */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}`, gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Time Distribution & Imbalance
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>{imbalanceInsight}</span>
            </div>
            <div style={{ height: "18px", borderRadius: "5px", overflow: "hidden", display: "flex", background: C.s2, marginBottom: "12px" }}>
              {subjectStats.map((sub) => sub.pct > 0 ? (
                <div key={sub.id} title={`${sub.name}: ${sub.pct}%`} style={{ width: `${sub.pct}%`, background: sub.color, height: "100%" }} />
              ) : null)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {subjectStats.map((sub) => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: sub.color }} />
                  <span style={{ color: C.txt, fontWeight: 600 }}>{sub.name}:</span>
                  <span style={{ color: C.muted }}>{fmtDur(sub.durationSecs)} ({sub.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAILORED VIEW: YEARLY (This Year Progress Box on SAME row as Monthly Hours in Year) */}
      {timeframe === "yearly" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          {/* This Year Box */}
          {renderProgressBox("year", "This Year (So Far)")}

          {/* Monthly Trend Across Year */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Monthly Study Hours in {monthlyTrendData.year}
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Hours logged per month across the year</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", height: "140px", gap: "8px", paddingTop: "10px" }}>
              {monthlyTrendData.months.map((m) => {
                const heightPct = Math.round((m.hours / monthlyTrendData.maxMonthHours) * 100);
                return (
                  <div key={m.label} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: "10px", color: C.muted, marginBottom: "4px" }}>
                      {m.hours > 0 ? `${m.hours.toFixed(1)}h` : "-"}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "24px",
                        height: `${Math.max(heightPct, 4)}%`,
                        borderRadius: "3px 3px 0 0",
                        background: m.isCurrent ? "#4F9CF9" : m.hours > 0 ? C.bdr2 : C.s2,
                      }}
                      title={`${m.label}: ${m.hours.toFixed(1)}h`}
                    />
                    <div style={{ fontSize: "9px", color: m.isCurrent ? C.txt : C.muted, marginTop: "6px" }}>{m.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Study Consistency in Year (Full Heatmap) */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}`, gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Study Consistency in Year (52-Week Heatmap)
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Annual contribution grid & streak history</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: "700px" }}>
                {[0, 1, 2, 3, 4, 5, 6].map((dayRowIdx) => (
                  <div key={dayRowIdx} style={{ display: "grid", gridTemplateColumns: "20px repeat(52, 1fr)", gap: "2px", alignItems: "center" }}>
                    <div style={{ fontSize: "9px", color: C.muted }}>{dayRowIdx % 2 === 0 ? DAY_NAMES[dayRowIdx].slice(0, 1) : ""}</div>
                    {Array.from({ length: 52 }).map((_, colWkIdx) => {
                      const cellIndex = colWkIdx * 7 + dayRowIdx;
                      const cell = heatmapGrid.gridDays[cellIndex];
                      if (!cell) return <div key={colWkIdx} />;
                      const hrs = cell.hours;
                      let bg = C.s2;
                      if (hrs > 4) bg = "#34D399";
                      else if (hrs > 2) bg = "rgba(52, 211, 153, 0.75)";
                      else if (hrs > 0.5) bg = "rgba(52, 211, 153, 0.5)";
                      else if (hrs > 0) bg = "rgba(52, 211, 153, 0.25)";

                      return (
                        <div
                          key={colWkIdx}
                          title={`${toYYYYMMDD(cell.date)}: ${hrs > 0 ? fmtDur(cell.secs) : "No study"}`}
                          style={{ height: "12px", borderRadius: "2px", background: bg, border: `1px solid ${hrs > 0 ? "rgba(52, 211, 153, 0.3)" : C.bdr}` }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAILORED VIEW: ALL TIME (All Time Progress Box on SAME row as Time Distribution) */}
      {timeframe === "all" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "20px" }}>
          {/* All Time Overview Box */}
          {renderProgressBox("all", "All Time Overview")}

          {/* Time Distribution */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Time Distribution & Imbalance
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Proportion of hours per subject</span>
            </div>
            <div style={{ padding: "8px 10px", borderRadius: "6px", background: C.s2, fontSize: "11px", color: C.txt, marginBottom: "12px" }}>
              💡 {imbalanceInsight}
            </div>
            <div style={{ height: "18px", borderRadius: "5px", overflow: "hidden", display: "flex", background: C.s2, marginBottom: "12px" }}>
              {subjectStats.map((sub) => sub.pct > 0 ? (
                <div key={sub.id} title={`${sub.name}: ${sub.pct}%`} style={{ width: `${sub.pct}%`, background: sub.color, height: "100%" }} />
              ) : null)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {subjectStats.map((sub) => (
                <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: sub.color }} />
                    <span style={{ color: C.txt, fontWeight: 600 }}>{sub.name}</span>
                  </div>
                  <span style={{ color: C.muted }}>{fmtDur(sub.durationSecs)} ({sub.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Needs Attention */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}` }}>
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Needs Attention
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Subjects ranked by priority</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {needsAttentionRank.slice(0, 3).map((item, idx) => (
                <div key={item.id} style={{ padding: "10px", borderRadius: "6px", background: C.s2, border: `1px solid ${C.bdr2}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: item.color }}>
                    <span>#{idx + 1} {item.name}</span>
                    <span>{item.priority} Priority</span>
                  </div>
                  <div style={{ fontSize: "10px", color: C.txt, marginTop: "2px" }}>{item.reason}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Study Consistency Heatmap (All Time 16-Week Grid) */}
          <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}`, gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
                Study Consistency (16-Week Grid)
              </h3>
              <span style={{ fontSize: "11px", color: C.muted }}>Streak & daily activity pattern</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {[0, 1, 2, 3, 4, 5, 6].map((dayRowIdx) => (
                <div key={dayRowIdx} style={{ display: "grid", gridTemplateColumns: "20px repeat(16, 1fr)", gap: "3px", alignItems: "center" }}>
                  <div style={{ fontSize: "9px", color: C.muted }}>{dayRowIdx % 2 === 0 ? DAY_NAMES[dayRowIdx].slice(0, 1) : ""}</div>
                  {Array.from({ length: 16 }).map((_, colWkIdx) => {
                    const cellIndex = colWkIdx * 7 + dayRowIdx;
                    const cell = heatmapGrid.gridDays[cellIndex];
                    if (!cell) return <div key={colWkIdx} />;
                    const hrs = cell.hours;
                    let bg = C.s2;
                    if (hrs > 4) bg = "#34D399";
                    else if (hrs > 2) bg = "rgba(52, 211, 153, 0.75)";
                    else if (hrs > 0.5) bg = "rgba(52, 211, 153, 0.5)";
                    else if (hrs > 0) bg = "rgba(52, 211, 153, 0.25)";

                    return (
                      <div
                        key={colWkIdx}
                        title={`${toYYYYMMDD(cell.date)}: ${hrs > 0 ? fmtDur(cell.secs) : "No study"}`}
                        style={{ height: "14px", borderRadius: "2px", background: bg, border: `1px solid ${hrs > 0 ? "rgba(52, 211, 153, 0.3)" : C.bdr}` }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Table (Always shown at bottom, filtered by timeframe) */}
      <div style={{ background: C.s1, padding: "18px", borderRadius: "10px", border: `1px solid ${C.bdr}`, marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: C.txt }}>
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Breakdown Table
            </h3>
            <span style={{ fontSize: "11px", color: C.muted }}>
              Detailed hours per subject across {timeframe} periods
            </span>
          </div>
        </div>

        {breakdownTables.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: C.muted, fontSize: "12px" }}>
            No study sessions logged for this timeframe.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.bdr2}`, color: C.muted, textAlign: "left" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Period</th>
                  {allSubjects.map((sub) => (
                    <th key={sub.id} style={{ padding: "8px 12px", fontWeight: 600 }}>
                      <span style={{ color: sub.color }}>{sub.name}</span>
                    </th>
                  ))}
                  <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {breakdownTables.map((row) => (
                  <tr key={row.key} style={{ borderBottom: `1px solid ${C.bdr}` }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: C.txt }}>{row.label}</td>
                    {allSubjects.map((sub) => (
                      <td key={sub.id} style={{ padding: "8px 12px", color: C.muted }}>
                        {row.subjects[sub.id] ? fmtDur(row.subjects[sub.id]) : "-"}
                      </td>
                    ))}
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: C.txt, textAlign: "right" }}>
                      {fmtDur(row.totalSecs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
