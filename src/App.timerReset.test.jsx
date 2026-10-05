import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./test/helpers.jsx";
import { fmt } from "./utils/format.js";

const TOPIC = "Components of a Computer";
const TWO_HOURS = 2 * 60 * 60;

const click = (name) => fireEvent.click(screen.getByRole("button", { name }));
const undoBar = () => screen.queryByRole("status", { name: /Reset timer/ });
const space = (target) => fireEvent.keyDown(target, { code: "Space", key: " " });

// A Computer Science session on one topic, with a note and a tag, two hours in.
const studyTwoHours = () => {
  renderApp();
  click("Computer Science");
  fireEvent.click(screen.getByText(TOPIC));
  fireEvent.change(screen.getByPlaceholderText("Session note (optional)"), { target: { value: "Chapter 3" } });
  click("Recap");
  click("Start");
  act(() => vi.advanceTimersByTime(TWO_HOURS * 1000));
  expect(screen.getByText(fmt(TWO_HOURS))).toBeTruthy();
};

describe("undo for timer Reset (N22)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("restores the elapsed time, subject, topic and draft, and logs the full session", () => {
    studyTwoHours();
    click("Reset");
    expect(screen.getByText(fmt(0))).toBeTruthy();
    expect(undoBar().textContent).toContain("Reset timer.");

    // Navigating away from the topic before undoing doesn't lose it.
    click("Maths");
    act(() => vi.advanceTimersByTime(30_000));
    fireEvent.click(within(undoBar()).getByRole("button", { name: "Undo" }));

    expect(undoBar()).toBeNull();
    expect(screen.getByText(fmt(TWO_HOURS))).toBeTruthy();
    expect(screen.getAllByText(TOPIC).length).toBeGreaterThan(1);
    // It was running at Reset, so it carries on from where it was.
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText(fmt(TWO_HOURS + 60))).toBeTruthy();

    click("Log Session");
    const [logged] = JSON.parse(localStorage.getItem("sb-sessions"));
    expect(logged.subjectId).toBe("cs");
    expect(logged.duration).toBe(TWO_HOURS + 60);
    expect(logged.note).toBe("Chapter 3");
    expect(logged.tags).toEqual(expect.arrayContaining(["Recap", TOPIC]));
  });

  it("restores a paused timer paused", () => {
    studyTwoHours();
    click("Pause");
    click("Reset");
    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.click(within(undoBar()).getByRole("button", { name: "Undo" }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText(fmt(TWO_HOURS))).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });

  it("survives a reload after Undo", () => {
    studyTwoHours();
    click("Pause");
    click("Reset");
    fireEvent.click(within(undoBar()).getByRole("button", { name: "Undo" }));
    expect(JSON.parse(localStorage.getItem("sb-timer"))).toMatchObject({ elapsed: TWO_HOURS, timedSubjectId: "cs" });
    expect(JSON.parse(localStorage.getItem("sb-session-draft"))).toMatchObject({ note: "Chapter 3", tags: ["Recap"] });
    expect(JSON.parse(localStorage.getItem("sb-session-draft")).topicId).toEqual(expect.any(String));
  });

  it("Space on the undo bar never toggles the timer", () => {
    studyTwoHours();
    click("Pause");
    click("Reset");
    const bar = undoBar();
    within(bar).getByRole("button", { name: "Undo" }).focus();
    space(document.activeElement);
    within(bar).getByRole("button", { name: "Dismiss" }).focus();
    space(document.activeElement);
    space(bar);
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText(fmt(0))).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    expect(undoBar()).toBeTruthy();

    fireEvent.click(within(bar).getByRole("button", { name: "Undo" }));
    space(document.body);
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });

  it("offers nothing when the timer had no time on it", () => {
    renderApp();
    click("Reset");
    expect(undoBar()).toBeNull();
    expect(screen.queryByRole("status", { name: /Deleted|Reset/ })).toBeNull();
  });

  it("withdraws the offer once a new session starts, so it can't overwrite it", () => {
    studyTwoHours();
    click("Reset");
    click("Start");
    expect(undoBar()).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    click("Pause");
    expect(undoBar()).toBeNull();
    click("Reset");
    // The new reset offers to bring back its own 10 seconds, not the two hours.
    fireEvent.click(within(undoBar()).getByRole("button", { name: "Undo" }));
    expect(screen.getByText(fmt(10))).toBeTruthy();
  });

  it("is replaced by a later delete and cleared when the view changes", () => {
    studyTwoHours();
    click("Reset");
    click("Analysis");
    expect(undoBar()).toBeNull();
  });
});
