import { act, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { STORAGE_KEYS, subscribe } from "./store/index.js";
import { subjectsForTemplate } from "./utils/catalogue.js";

// Review R1 on fix/replace-writes-tombstones: Use template awaits the
// catalogue, then replaces the subjects. If another tab finished onboarding
// while it loaded (restore, Start blank, its own template), this tab has
// already taken that tab's subjects and tombstones in, and the late template
// must not replace them from the state captured at the click.
vi.mock("./utils/catalogue.js", async (importOriginal) => ({
  ...(await importOriginal()),
  subjectsForTemplate: vi.fn(),
}));

let queued = [];
let stopQueueing = () => {};

beforeEach(() => {
  queued = [];
  stopQueueing = subscribe((change) => {
    if (change.type === "write" || change.type === "remove") queued.push(change.key);
  });
});

afterEach(() => stopQueueing());

// Deliver queued writes to the other tabs as `storage` events.
const deliver = () => {
  const keys = queued.splice(0);
  act(() => {
    keys.forEach((key) =>
      window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: localStorage.getItem(key), storageArea: localStorage })
      )
    );
  });
};

const stored = (key) => JSON.parse(localStorage.getItem(key));
const at = (day) => `2026-09-${day}T10:00:00.000Z`;
const template = [{ id: "tpl-maths", name: "Template Maths", color: "#123456", topics: [] }];

describe("Use template while another tab finishes onboarding", () => {
  it("drops the late template and keeps the other tab's subjects and tombstones", async () => {
    let finishLoading;
    subjectsForTemplate.mockImplementation(() => new Promise((resolve) => (finishLoading = resolve)));
    const a = render(<App />);
    const b = render(<App />);
    const tabA = within(a.container);
    const tabB = within(b.container);
    queued.splice(0);

    // Tab A starts loading a template.
    fireEvent.click(tabA.getByRole("button", { name: /Use GCSE core subjects/ }));
    await act(async () => {});

    // Meanwhile tab B restores a v3 backup carrying a tombstone, and tab A takes it in.
    const bio = { id: "bio", name: "Biology", color: "#00ff00", topics: [] };
    const tombstones = { subjects: { chem: at(11) }, topics: {}, milestones: {}, sessions: { "sess-gone": at(11) } };
    fireEvent.change(tabB.getByLabelText("Restore backup file"), {
      target: { files: [new File([JSON.stringify({ version: 3, subjects: [bio], sessions: [], tombstones })], "b.json")] },
    });
    await waitFor(() => expect(tabB.queryByLabelText("Restore backup file")).toBeNull());
    await act(async () => {});
    deliver();
    // Tab B is closed, so nothing would write its tombstones back.
    b.unmount();

    // Tab A's template finishes loading.
    await act(async () => finishLoading(template));
    await act(async () => {});

    expect(stored(STORAGE_KEYS.subjects).map((s) => s.id)).toEqual(["bio"]);
    expect(stored(STORAGE_KEYS.tombstones).subjects.chem).toBe(at(11));
    expect(stored(STORAGE_KEYS.tombstones).sessions["sess-gone"]).toBe(at(11));
    expect(tabA.queryByText("Template Maths")).toBeNull();
    expect(tabA.getAllByText(/Biology/).length).toBeGreaterThan(0);
  });

  it("still applies the template when nothing else finished onboarding", async () => {
    let finishLoading;
    subjectsForTemplate.mockImplementation(() => new Promise((resolve) => (finishLoading = resolve)));
    const tab = within(render(<App />).container);

    fireEvent.click(tab.getByRole("button", { name: /Use GCSE core subjects/ }));
    await act(async () => finishLoading(template));
    await act(async () => {});

    expect(stored(STORAGE_KEYS.subjects).map((s) => s.id)).toEqual(["tpl-maths"]);
    expect(tab.getAllByText(/Template Maths/).length).toBeGreaterThan(0);
  });
});
