import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

const openSettings = async (user) => {
  await user.click(screen.getByRole("button", { name: "Settings" }));
};

const openPlanner = async (user) => {
  await user.click(screen.getByRole("button", { name: "Planner" }));
};

describe("StudyBox customization", () => {
  it("edits and deletes default subjects", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openSettings(user);

    const physicsName = screen.getByLabelText("Subject name physics");
    await user.clear(physicsName);
    await user.type(physicsName, "Advanced Physics");
    const physicsExam = screen.getByLabelText("Subject exam physics");
    await user.clear(physicsExam);
    await user.type(physicsExam, "AQA");
    fireEvent.change(screen.getByLabelText("Subject colour physics"), {
      target: { value: "#ff7a59" },
    });
    await openPlanner(user);

    expect(screen.getByRole("button", { name: "Advanced Physics" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Physics" })).toBeNull();

    await openSettings(user);
    await user.click(screen.getByRole("button", { name: "Delete subject maths" }));

    await openPlanner(user);
    expect(screen.queryByRole("button", { name: "Maths" })).toBeNull();
    expect(localStorage.getItem("sb-subjects")).toContain("Advanced Physics");
  });

  it("switches themes and persists the selected theme", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openSettings(user);
    await user.click(screen.getByRole("button", { name: /Paper/ }));

    const paperCard = screen.getByRole("button", { name: /Paper/ });
    expect(paperCard.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("sb-theme")).toBe('"paper"');
  });

  it("logs a session with tags and shows them in history", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.change(screen.getByPlaceholderText("Add tag"), {
      target: { value: "Past papers" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add session tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Blurting" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));
    fireEvent.click(screen.getByRole("button", { name: "Log" }));

    expect(screen.getByText("Past papers")).toBeTruthy();
    expect(screen.getByText("Blurting")).toBeTruthy();
    expect(localStorage.getItem("sb-sessions")).toContain("Past papers");
  });
});
