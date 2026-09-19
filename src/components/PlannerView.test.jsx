import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/helpers.jsx";

describe("Planner", () => {
  it("logs a session with tags and shows them in history", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.change(screen.getByPlaceholderText("Add tag"), { target: { value: "Past papers" } });
    fireEvent.click(screen.getByRole("button", { name: "Add session tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Blurting" }));
    act(() => vi.advanceTimersByTime(1000));

    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    fireEvent.click(screen.getByRole("button", { name: "Log" }));

    expect(screen.getByText("Past papers")).toBeTruthy();
    expect(screen.getByText("Blurting")).toBeTruthy();
    expect(localStorage.getItem("sb-sessions")).toContain("Past papers");
  });

  it("adds the expanded topic as a session tag", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
    renderApp();

    fireEvent.click(screen.getByText("Practical Skills in Physics"));
    expect(screen.getByPlaceholderText("Add subtask")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));

    const saved = JSON.parse(localStorage.getItem("sb-sessions"));
    expect(saved[0].tags).toContain("Practical Skills in Physics");
  });

  it("keeps time accurate across a simulated background period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => {
      vi.setSystemTime(new Date("2026-06-19T09:30:00.000Z"));
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("30:00")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    const saved = JSON.parse(localStorage.getItem("sb-sessions"));
    expect(saved[0].duration).toBe(1800);
  });

  it("toggles the timer with the space bar but not while typing", () => {
    renderApp();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();

    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();

    fireEvent.keyDown(screen.getByPlaceholderText("Add tag"), { code: "Space", key: " " });
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();

    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });

  it("adds and completes topics and subtasks", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByPlaceholderText("Add topic to Physics..."), "Waves{Enter}");
    expect(screen.getByText("Waves")).toBeTruthy();

    await user.click(screen.getByText("Waves"));
    await user.type(screen.getByPlaceholderText("Add subtask"), "Diffraction{Enter}");
    expect(screen.getByText("Diffraction")).toBeTruthy();

    await user.click(screen.getByRole("checkbox", { name: "Complete topic Waves" }));
    expect(screen.getByText(/Completed \(1\)/)).toBeTruthy();
    expect(screen.getByText("⚡ 10 XP")).toBeTruthy();
  });

  it("shows an empty state with an add-subject prompt when there are no subjects", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sb-subjects", "[]");
    renderApp();

    expect(screen.getByText("No subjects yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start" }).disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: "Add your first subject" }));
    expect(screen.getByText("Add Subject")).toBeTruthy();
  });

  it("shows the 0m total from day one", () => {
    renderApp();
    expect(screen.getByText("0m total")).toBeTruthy();
  });
});
