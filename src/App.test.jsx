import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { markUpdateReady } from "./pwa/updateStore.js";
import { goTo, renderApp } from "./test/helpers.jsx";

describe("StudyBox shell", () => {
  it("navigates the Analysis tab and its timeframes, and via the More button", async () => {
    const user = userEvent.setup();
    renderApp();

    await goTo(user, "Analysis");
    expect(screen.getByText("Study Analysis")).toBeTruthy();
    expect(screen.getByText("All Time Overview")).toBeTruthy();

    await goTo(user, "Daily");
    expect(screen.getByText("Hours Per Day (Last 7 Days)")).toBeTruthy();
    await goTo(user, "Weekly");
    expect(screen.getByText("Topic Coverage Gaps")).toBeTruthy();
    await goTo(user, "Monthly");
    expect(screen.getByText("Study Consistency in Month")).toBeTruthy();
    await goTo(user, "Yearly");
    expect(screen.getByText("Study Consistency in Year (52-Week Heatmap)")).toBeTruthy();

    await goTo(user, "Planner");
    expect(screen.queryByText("Study Analysis")).toBeNull();
    await goTo(user, "More study analysis");
    expect(screen.getByText("Study Analysis")).toBeTruthy();

    await user.selectOptions(screen.getByRole("combobox"), "physics");
    expect(screen.getByText(/study metrics · Physics/)).toBeTruthy();
  });

  it("analysis subject filter updates the per-subject stats", async () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    fireEvent.click(screen.getByRole("button", { name: "Analysis" }));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "maths" } });
    expect(screen.getAllByText(/Maths/).length).toBeGreaterThan(0);
    expect(screen.getByText("No study logged for this period yet")).toBeTruthy();
  });

  it("handles streak and XP on logging sessions and checking topics", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
    renderApp();

    expect(screen.getByText("🔥 0d")).toBeTruthy();
    expect(screen.getByText("⚡ 0 XP")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(120000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));

    expect(screen.getByText("🔥 1d")).toBeTruthy();
    expect(screen.getByText("⚡ 2 XP")).toBeTruthy();

    const game = JSON.parse(localStorage.getItem("sb-game"));
    expect(game.currentStreak).toBe(1);
    expect(game.totalXP).toBe(2);
    expect(game.lastStudyDate).toBe("2026-09-14");

    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("⚡ 12 XP")).toBeTruthy();
  });

  it("takes topic XP back on untick, so ticking repeatedly can't farm XP", () => {
    renderApp();
    const name = screen.getAllByRole("checkbox")[0].getAttribute("aria-label").replace("Complete topic ", "");
    const tick = () =>
      fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`^(Complete|Reopen) topic ${name}$`) }));

    tick();
    expect(screen.getByText("⚡ 10 XP")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Completed \(1\)/ }));
    tick();
    expect(screen.getByText("⚡ 0 XP")).toBeTruthy();
    for (let i = 0; i < 9; i += 1) tick();
    expect(screen.getByText("⚡ 10 XP")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sb-game")).totalXP).toBe(10);
  });

  it("takes a session's XP back when the session is deleted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(300000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    expect(screen.getByText("⚡ 5 XP")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Log" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete session Physics" }));
    expect(screen.getByText("⚡ 0 XP")).toBeTruthy();
  });

  it("keeps the XP an existing install had already earned", () => {
    localStorage.setItem("sb-game", JSON.stringify({ totalXP: 740, currentStreak: 0 }));
    renderApp();
    expect(screen.getByText("⚡ 740 XP")).toBeTruthy();

    const name = screen.getAllByRole("checkbox")[0].getAttribute("aria-label").replace("Complete topic ", "");
    fireEvent.click(screen.getByRole("checkbox", { name: `Complete topic ${name}` }));
    expect(screen.getByText("⚡ 750 XP")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Completed \(1\)/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: `Reopen topic ${name}` }));
    expect(screen.getByText("⚡ 740 XP")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sb-game")).legacyXP).toBe(740);
  });

  it("does not reset a streak before the post-23:59 24-hour deadline", () => {
    vi.useFakeTimers();
    const expiry = new Date(2026, 8, 14, 23, 59, 59, 999).getTime() + 86400000;
    vi.setSystemTime(expiry - 1);
    localStorage.setItem("sb-game", JSON.stringify({ currentStreak: 3, lastStudyDate: "2026-09-14" }));

    renderApp();
    expect(screen.getByTitle("Current streak: 3 day(s)")).toBeTruthy();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTitle("Current streak: 0 day(s)")).toBeTruthy();
  });

  it("persists a streak freeze across a restart and resets only after it is used", () => {
    vi.useFakeTimers();
    const expiry = new Date(2026, 8, 14, 23, 59, 59, 999).getTime() + 86400000;
    vi.setSystemTime(expiry);
    localStorage.setItem(
      "sb-game",
      JSON.stringify({ currentStreak: 3, lastStudyDate: "2026-09-14", totalXP: 500, freezesUsed: 0 })
    );

    const first = renderApp();
    expect(screen.getByTitle("Current streak: 3 day(s)")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sb-game")).freezesUsed).toBe(1);

    first.unmount();
    vi.setSystemTime(expiry + 86400000);
    renderApp();
    expect(screen.getByTitle("Current streak: 0 day(s)")).toBeTruthy();
  });
});

describe("surviving an app update", () => {
  it("keeps the session note and tags across a reload", () => {
    const first = renderApp();
    fireEvent.change(screen.getByPlaceholderText("Session note (optional)"), {
      target: { value: "Chapter 3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Recap" }));
    first.unmount();

    renderApp();
    expect(screen.getByPlaceholderText("Session note (optional)").value).toBe("Chapter 3");
    expect(screen.getByRole("button", { name: "Remove tag Recap" })).toBeTruthy();
  });

  it("holds an update during a session and offers it in a banner", () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    act(() => markUpdateReady(apply));
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Update now" }));
    expect(apply).toHaveBeenCalledTimes(1);
  });

  // R3: the timed topic (shown under the timer, tagged on log) survives a reload.
  it("keeps the timed topic across a reload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
    const first = renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Computer Science" }));
    fireEvent.click(screen.getByText("Components of a Computer"));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60000));
    first.unmount();

    renderApp();
    expect(screen.getAllByText("Components of a Computer").length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    const saved = JSON.parse(localStorage.getItem("sb-sessions"));
    expect(saved[0].subjectId).toBe("cs");
    expect(saved[0].tags).toContain("Components of a Computer");
    expect(localStorage.getItem("sb-session-draft")).toBeNull();
  });

  // R2: an unsaved Add subject form in Settings must not be reloaded away.
  it("holds an update while the user is away from the planner", async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    renderApp();
    await goTo(user, "Settings");
    fireEvent.change(screen.getByPlaceholderText("Subject name"), {
      target: { value: "Further Maths" },
    });

    act(() => markUpdateReady(apply));
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Subject name").value).toBe("Further Maths");
  });

  it("holds an update during onboarding", () => {
    const apply = vi.fn();
    renderApp({ onboarded: false });

    act(() => markUpdateReady(apply));
    expect(apply).not.toHaveBeenCalled();
  });

  it("applies an update straight away on the idle planner", () => {
    const apply = vi.fn();
    renderApp();

    act(() => markUpdateReady(apply));
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("applies the update once the session is logged", () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60000));
    act(() => markUpdateReady(apply));
    expect(apply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe("sync-safe records (schema v3)", () => {
  const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  const stored = (key) => JSON.parse(localStorage.getItem(key));

  it("logs sessions with a UUID id and createdAt/updatedAt stamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T10:00:00.000Z"));
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));

    const [session] = stored("sb-sessions");
    expect(session.id).toMatch(new RegExp(`^sess-${UUID}$`));
    expect(session.createdAt).toBe("2026-10-05T10:01:00.000Z");
    expect(session.updatedAt).toBe(session.createdAt);
  });

  it("stamps only the topic that was ticked, and leaves existing ids alone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T10:00:00.000Z"));
    renderApp();
    const before = stored("sb-subjects");

    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    const after = stored("sb-subjects");
    expect(after.map((s) => s.id)).toEqual(before.map((s) => s.id));
    expect(after[0].topics.map((t) => t.id)).toEqual(before[0].topics.map((t) => t.id));
    expect(after[0].topics[0]).toMatchObject({ done: true, updatedAt: "2026-10-05T10:00:00.000Z" });
    expect(after[0].topics[1]).not.toHaveProperty("updatedAt");
    expect(after[0]).not.toHaveProperty("updatedAt");
  });

  it("leaves a tombstone when a session is deleted, and exports nothing else of it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T10:00:00.000Z"));
    localStorage.setItem(
      "sb-sessions",
      JSON.stringify([{ id: "sess-old", subjectId: "physics", subjectName: "Physics", duration: 600, date: "2026-10-01T09:00:00.000Z" }])
    );
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Log" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete session Physics" }));

    expect(stored("sb-sessions")).toEqual([]);
    expect(stored("sb-tombstones").sessions).toEqual({ "sess-old": "2026-10-05T10:00:00.000Z" });
  });

  it("starts an existing install with empty tombstones and untouched data", () => {
    const sessions = [{ id: "sess-old", subjectId: "physics", subjectName: "Physics", subjectColor: "#4F9CF9", duration: 600, date: "2026-10-01T09:00:00.000Z", note: "", tags: [] }];
    localStorage.setItem("sb-sessions", JSON.stringify(sessions));
    renderApp();
    expect(stored("sb-sessions")).toEqual(sessions);
    expect(stored("sb-tombstones")).toEqual({ subjects: {}, topics: {}, milestones: {}, sessions: {} });
  });
});
