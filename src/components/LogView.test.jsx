import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/helpers.jsx";

describe("Log view", () => {
  it("shows an empty state before any session is logged", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Log" }));
    expect(screen.getByText("No sessions yet.")).toBeTruthy();
  });

  it("edits a logged session (subject, duration, tags, date)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    fireEvent.click(screen.getByRole("button", { name: "Log" }));

    expect(screen.getAllByText("1m").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Edit session Physics" }));
    expect(screen.getByText("Edit Study Session")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "maths" } });
    fireEvent.change(screen.getByDisplayValue("0"), { target: { value: "2" } });
    fireEvent.change(screen.getByDisplayValue("1"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-06-20" } });
    fireEvent.change(screen.getByPlaceholderText("Add tag..."), { target: { value: "Revision" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByText("Edit Study Session")).toBeNull();
    expect(screen.queryByText("1m")).toBeNull();
    expect(screen.getAllByText("Maths").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2h 15m").length).toBeGreaterThan(0);
    expect(screen.getByText("Revision")).toBeTruthy();
  });

  it("deletes a session", () => {
    vi.useFakeTimers();
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    fireEvent.click(screen.getByRole("button", { name: "Log" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete session Physics" }));

    expect(screen.getByText("No sessions yet.")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sb-sessions"))).toEqual([]);
  });

  describe("Asana in By Subject", () => {
    const asanaSession = {
      id: 1,
      subjectId: "asana",
      subjectName: "Asana Tasks",
      subjectColor: "#F06A6A",
      duration: 5400,
      date: "2026-06-19T09:00:00.000Z",
      note: "",
      tags: [],
    };
    const bySubject = () => screen.getByText("By Subject").nextElementSibling;

    it("lists Asana tasks when Asana is enabled", () => {
      localStorage.setItem("sb-asana", JSON.stringify({ enabled: true }));
      renderApp();
      fireEvent.click(screen.getByRole("button", { name: "Log" }));
      expect(within(bySubject()).getByText("Asana Tasks")).toBeTruthy();
    });

    it("hides Asana tasks when disabled and nothing was logged against them", () => {
      localStorage.setItem("sb-asana", JSON.stringify({ enabled: false }));
      renderApp();
      fireEvent.click(screen.getByRole("button", { name: "Log" }));
      expect(within(bySubject()).queryByText("Asana Tasks")).toBeNull();
    });

    it("keeps Asana time visible after Asana is disabled", () => {
      localStorage.setItem("sb-asana", JSON.stringify({ enabled: false }));
      localStorage.setItem("sb-sessions", JSON.stringify([asanaSession]));
      renderApp();
      fireEvent.click(screen.getByRole("button", { name: "Log" }));
      expect(within(bySubject()).getByText("Asana Tasks")).toBeTruthy();
      expect(within(bySubject()).getByText("1h 30m")).toBeTruthy();
    });
  });

  it("does not toggle the timer with space while the edit dialog is open", () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    fireEvent.click(screen.getByRole("button", { name: "Log" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit session Physics" }));

    fireEvent.keyDown(window, { code: "Space", key: " " });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Planner" }));
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });
});
