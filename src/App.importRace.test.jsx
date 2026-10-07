import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { goTo, renderApp } from "./test/helpers.jsx";
import userEvent from "@testing-library/user-event";

// R1 from #66's review: Merge and Restore from file were built from the state
// this tab held when the file was picked, not when the read finished. A change
// another tab saved while the file was read was overwritten here, and lost for
// good if that tab then closed. The file read is held open below so the other
// tab's change lands in the middle of it.
let finishRead = () => {};
vi.mock("./utils/backup.js", async (importOriginal) => ({
  ...(await importOriginal()),
  readFileText: (file) =>
    new Promise((resolve) => {
      finishRead = () => file.text().then(resolve);
    }),
}));

const at = (day) => `2026-09-${day}T10:00:00.000Z`;
const session = (id, note) => ({
  id,
  subjectId: "physics",
  subjectName: "Physics",
  subjectColor: "#4F9CF9",
  duration: 1800,
  date: at(13),
  note,
  tags: [],
  createdAt: at(13),
  updatedAt: at(13),
});

const stored = (key) => JSON.parse(localStorage.getItem(key));
const ids = (key) => stored(key).map((s) => s.id).sort();
const backupFile = (body) =>
  new File([JSON.stringify({ version: 3, ...body })], "backup.json", { type: "application/json" });

// What another tab does: write storage, then the browser fires `storage` here.
const otherTabSaves = (key, value) =>
  act(() => {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value), storageArea: localStorage }));
  });

const importWhileOtherTabSaves = async (label, file) => {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
  // The other tab logs a session while this tab is still reading the file.
  otherTabSaves("sb-sessions", [session("s-mine", "mine"), session("s-other-tab", "logged in the other tab")]);
  await act(async () => finishRead());
};

describe("Merge and Restore from file with another tab saving during the file read", () => {
  it("Merge keeps the other tab's change, and Undo merge keeps it too", async () => {
    localStorage.setItem("sb-sessions", JSON.stringify([session("s-mine", "mine")]));
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");

    await importWhileOtherTabSaves("Merge backup file", backupFile({ sessions: [session("s-file", "from the file")] }));
    expect(await screen.findByText("Backup merged with the data on this device.")).toBeTruthy();
    await act(async () => {});

    expect(ids("sb-sessions")).toEqual(["s-file", "s-mine", "s-other-tab"]);

    // Undo merge puts back what the merge replaced: that includes the other tab's session.
    fireEvent.click(screen.getByRole("button", { name: "Undo merge" }));
    await act(async () => {});
    expect(ids("sb-sessions")).toEqual(["s-mine", "s-other-tab"]);
  });

  it("Restore tombstones the other tab's change it replaces, and Undo restore brings it back", async () => {
    localStorage.setItem("sb-sessions", JSON.stringify([session("s-mine", "mine")]));
    const user = userEvent.setup();
    renderApp();
    await goTo(user, "Settings");

    await importWhileOtherTabSaves("Restore backup file", backupFile({ subjects: [], sessions: [session("s-file", "from the file")] }));
    expect(await screen.findByText("Backup restored.")).toBeTruthy();
    await act(async () => {});

    expect(ids("sb-sessions")).toEqual(["s-file"]);
    // Removed by the restore, so no other tab (or later merge) brings it back (N10).
    expect(Object.keys(stored("sb-tombstones").sessions).sort()).toEqual(["s-mine", "s-other-tab"]);

    fireEvent.click(screen.getByRole("button", { name: "Undo restore" }));
    await act(async () => {});
    expect(ids("sb-sessions")).toEqual(["s-mine", "s-other-tab"]);
  });
});
