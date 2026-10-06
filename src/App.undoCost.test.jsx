import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { goTo, renderApp } from "./test/helpers.jsx";
import { canUndoImport } from "./utils/undo.js";

// R2: whether Undo restore is still offered compares (and may merge) all the
// data. It must be worked out again only when the data or the offer changes,
// not on every render (timer ticks, keystrokes, view changes).
vi.mock("./utils/undo.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, canUndoImport: vi.fn(actual.canUndoImport) };
});

const backupFile = () =>
  new File(
    [JSON.stringify({ version: 3, subjects: [{ id: "other", name: "Other", color: "#123456", topics: [] }], sessions: [] })],
    "backup.json",
    { type: "application/json" }
  );

describe("the Undo restore check", () => {
  it("isn't recomputed by renders that change no data", async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => expect(localStorage.getItem("sb-game")).not.toBeNull());
    await goTo(user, "Settings");
    await user.upload(screen.getByLabelText("Restore backup file"), backupFile());
    expect(await screen.findByRole("button", { name: "Undo restore" })).toBeTruthy();
    // Let the restore's writes settle.
    await waitFor(() => expect(JSON.parse(localStorage.getItem("sb-subjects"))[0].id).toBe("other"));

    canUndoImport.mockClear();
    await goTo(user, "Planner");
    await goTo(user, "Log");
    await goTo(user, "Settings");

    expect(screen.getByRole("button", { name: "Undo restore" })).toBeTruthy();
    expect(canUndoImport).not.toHaveBeenCalled();
  });
});
