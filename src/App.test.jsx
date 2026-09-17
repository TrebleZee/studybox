import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { generateSubjectDraftFromSpecText } from "./specInference.js";
import { extractPdfText } from "./specImport.js";

vi.mock("./specImport.js", () => ({
  extractPdfText: vi.fn(),
  generateSubjectDraftFromPdfText: generateSubjectDraftFromSpecText,
}));
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

  it("adds the expanded normal-subject topic as a session tag", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));

    render(<App />);

    fireEvent.click(screen.getByText("Practical Skills in Physics"));
    expect(screen.getByPlaceholderText("Add subtask")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));

    const savedSessions = JSON.parse(localStorage.getItem("sb-sessions"));
    expect(savedSessions[0].tags).toContain("Practical Skills in Physics");

    vi.useRealTimers();
  });

  it("imports a subject spec pdf into the creation form", async () => {
    const user = userEvent.setup();
    extractPdfText.mockResolvedValueOnce(`
      AQA A Level Art History Specification 1 Introduction to Art History 1.1 Ancient Art
      1.2 Modern Art 2 Key Movements 2.1 Renaissance 2.2 Modernism
    `);

    render(<App />);

    await openSettings(user);
    const file = new File(["spec"], "aqa-art-history-specification.pdf", {
      type: "application/pdf",
    });

    await user.upload(
      screen.getByLabelText("Import subject specification PDF"),
      file
    );

    expect(await screen.findByDisplayValue("Art History")).toBeTruthy();
    expect(screen.getByDisplayValue("AQA")).toBeTruthy();
    expect(screen.getByText("Ancient Art")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Create subject" }));

    await openPlanner(user);
    expect(screen.getByRole("button", { name: "Art History" })).toBeTruthy();
    expect(screen.getByText("Ancient Art")).toBeTruthy();
  });

  it("allows editing of a logged study session (subject, duration, tags, date)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T09:00:00.000Z"));

    render(<App />);

    // Start timer and log a session
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => {
      vi.advanceTimersByTime(60000); // 60 seconds (1 minute)
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));

    // Switch to Log view
    fireEvent.click(screen.getByRole("button", { name: "Log" }));

    // Initially should show: Physics (the default selected subject), 1m, date
    expect(screen.getAllByText("Physics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1m").length).toBeGreaterThan(0);

    // Click "Edit" button
    fireEvent.click(screen.getByRole("button", { name: "Edit session Physics" }));

    // Verify Edit Modal is visible
    expect(screen.getByText("Edit Study Session")).toBeTruthy();

    // Change subject from Physics to Maths
    const select = screen.getByLabelText("Subject");
    fireEvent.change(select, { target: { value: "maths" } });

    // Change duration to 2 hours 15 minutes
    const hoursInput = screen.getByDisplayValue("0");
    fireEvent.change(hoursInput, { target: { value: "2" } });

    const minutesInput = screen.getByDisplayValue("1");
    fireEvent.change(minutesInput, { target: { value: "15" } });

    // Change date
    const dateInput = screen.getByLabelText("Date");
    fireEvent.change(dateInput, { target: { value: "2026-06-20" } });

    // Add a new tag
    const tagInput = screen.getByPlaceholderText("Add tag...");
    fireEvent.change(tagInput, { target: { value: "Revision" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    // Save changes
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Verify modal is closed
    expect(screen.queryByText("Edit Study Session")).toBeNull();

    // Verify the log row has updated values:
    // Subject should be Maths, duration should be 2h 15m, tags should contain Revision
    expect(screen.queryByText("1m")).toBeNull();
    expect(screen.getAllByText("Maths").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2h 15m").length).toBeGreaterThan(0);
    expect(screen.getByText("Revision")).toBeTruthy();

    vi.useRealTimers();
  });

  it("navigates to Analysis tab via top nav and More button under total study time", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click top tab row Analysis button (All Time by default)
    await user.click(screen.getByRole("button", { name: "Analysis" }));
    expect(screen.getByText("Study Analysis")).toBeTruthy();
    expect(screen.getByText("All Time Overview")).toBeTruthy();
    expect(screen.getByText("Time Distribution & Imbalance")).toBeTruthy();
    expect(screen.getByText("Needs Attention")).toBeTruthy();

    // Switch to Daily timeframe
    await user.click(screen.getByRole("button", { name: "Daily" }));
    expect(screen.getByText("Today (So Far)")).toBeTruthy();
    expect(screen.getByText("Hours Per Day (Last 7 Days)")).toBeTruthy();
    expect(screen.getByText("Day-of-Week Pattern (In General)")).toBeTruthy();

    // Switch to Weekly timeframe
    await user.click(screen.getByRole("button", { name: "Weekly" }));
    expect(screen.getByText("This Week (So Far)")).toBeTruthy();
    expect(screen.getByText("Weekly Trend (Hours per Week)")).toBeTruthy();
    expect(screen.getByText("Topic Coverage Gaps")).toBeTruthy();

    // Switch to Monthly timeframe
    await user.click(screen.getByRole("button", { name: "Monthly" }));
    expect(screen.getByText("This Month (So Far)")).toBeTruthy();
    expect(screen.getByText("Weekly Trend in Month")).toBeTruthy();
    expect(screen.getByText("Study Consistency in Month")).toBeTruthy();

    // Switch to Yearly timeframe
    await user.click(screen.getByRole("button", { name: "Yearly" }));
    expect(screen.getByText("This Year (So Far)")).toBeTruthy();
    expect(screen.getByText("Study Consistency in Year (52-Week Heatmap)")).toBeTruthy();

    // Go back to Planner
    await openPlanner(user);
    expect(screen.queryByText("Study Analysis")).toBeNull();

    // Click "More" button under total study time
    await user.click(screen.getByRole("button", { name: "More study analysis" }));
    expect(screen.getByText("Study Analysis")).toBeTruthy();

    // Select Physics subject filter
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "physics");
    expect(screen.getByText(/Physics/)).toBeTruthy();
  });

  it("handles sb-game streak and XP logic on logging sessions and checking topics", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"));

    render(<App />);

    // Check initial streak UI stats
    expect(screen.getByText("🔥 0d")).toBeTruthy();
    expect(screen.getByText("⚡ 0 XP")).toBeTruthy();

    // Log a session of 120 seconds (2 mins = 2 XP)
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    act(() => {
      vi.advanceTimersByTime(120000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Log Session" }));

    // Streak should increase to 1d and XP to 2 XP
    expect(screen.getByText("🔥 1d")).toBeTruthy();
    expect(screen.getByText("⚡ 2 XP")).toBeTruthy();

    // Check localStorage sb-game
    const gameObj = JSON.parse(localStorage.getItem("sb-game"));
    expect(gameObj.currentStreak).toBe(1);
    expect(gameObj.totalXP).toBe(2);
    expect(gameObj.lastStudyDate).toBe("2026-09-14");

    // Check a topic to earn +10 XP
    const checkboxes = screen.getAllByRole("checkbox");
    if (checkboxes.length > 0) {
      fireEvent.click(checkboxes[0]);
      expect(screen.getByText("⚡ 12 XP")).toBeTruthy();
    }

    vi.useRealTimers();
  });

  it("does not reset a streak before the post-23:59 24-hour deadline", () => {
    vi.useFakeTimers();
    const expiry = new Date(2026, 8, 14, 23, 59, 59, 999).getTime() + 86400000;
    vi.setSystemTime(expiry - 1);
    localStorage.setItem(
      "sb-game",
      JSON.stringify({ currentStreak: 3, lastStudyDate: "2026-09-14" })
    );

    render(<App />);
    expect(screen.getByTitle("Current streak: 3 day(s)")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTitle("Current streak: 0 day(s)")).toBeTruthy();
  });

  it("persists a streak freeze across a restart and resets only after it is used", () => {
    vi.useFakeTimers();
    const expiry = new Date(2026, 8, 14, 23, 59, 59, 999).getTime() + 86400000;
    vi.setSystemTime(expiry);
    localStorage.setItem(
      "sb-game",
      JSON.stringify({
        currentStreak: 3,
        lastStudyDate: "2026-09-14",
        totalXP: 500,
        freezesUsed: 0,
      })
    );

    const firstLaunch = render(<App />);
    expect(screen.getByTitle("Current streak: 3 day(s)")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sb-game")).freezesUsed).toBe(1);

    firstLaunch.unmount();
    vi.setSystemTime(expiry + 86400000);
    render(<App />);
    expect(screen.getByTitle("Current streak: 0 day(s)")).toBeTruthy();
  });
});


