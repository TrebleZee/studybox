import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
