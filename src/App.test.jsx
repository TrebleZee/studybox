import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

const openSettings = async (user) => {
  await user.click(screen.getByRole("button", { name: "Settings" }));
};

describe("StudyBox customization", () => {
  it("adds and removes custom subjects", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openSettings(user);

    await user.type(screen.getByPlaceholderText("Subject name"), "Art History");
    await user.type(screen.getByPlaceholderText("Exam board"), "AQA");
    fireEvent.change(screen.getByTitle("Subject colour"), {
      target: { value: "#ff7a59" },
    });
    await user.click(screen.getByRole("button", { name: "Create subject" }));

    await screen.findByText("Art History");
    expect(screen.getByRole("button", { name: /Remove subject Art History/ })).toBeTruthy();

    await openSettings(user);
    await user.click(screen.getByRole("button", { name: /Remove subject Art History/ }));

    expect(screen.queryByText("Art History")).toBeNull();
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
