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
});
