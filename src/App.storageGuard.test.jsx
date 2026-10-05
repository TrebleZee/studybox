import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./test/helpers.jsx";

const captureDownload = () => {
  let blob;
  URL.createObjectURL = vi.fn((b) => {
    blob = b;
    return "blob:test";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return async () => JSON.parse(await blob.text());
};

const TRUNCATED_SUBJECTS = '[{"id":"maths","name":"Maths","topics":[{"id":"t1","name":"Alge';
const TRUNCATED_SESSIONS = '[{"id":"s1","subjectId":"maths","duration":1500,"date":"2026-10-0';

// N16: a key whose stored text doesn't parse used to be treated as missing
// and overwritten with defaults on mount, with no message.
describe("stored data that can't be read", () => {
  afterEach(() => vi.restoreAllMocks());

  it("leaves truncated subjects and sessions in storage, unchanged, and says so", async () => {
    localStorage.setItem("sb-subjects", TRUNCATED_SUBJECTS);
    localStorage.setItem("sb-sessions", TRUNCATED_SESSIONS);
    renderApp();

    expect(screen.getByRole("alert", { name: /couldn't be read/ })).toBeTruthy();
    expect(localStorage.getItem("sb-subjects")).toBe(TRUNCATED_SUBJECTS);
    expect(localStorage.getItem("sb-sessions")).toBe(TRUNCATED_SESSIONS);
  });

  it("downloads the unreadable text as it is stored", async () => {
    const user = userEvent.setup();
    const downloaded = captureDownload();
    localStorage.setItem("sb-sessions", TRUNCATED_SESSIONS);
    localStorage.setItem("studybox_asana_pat", "1/secret-token");
    renderApp();

    await user.click(screen.getByRole("button", { name: "Download a backup" }));
    const backup = await downloaded();
    expect(backup.unreadable).toEqual({ "sb-sessions": TRUNCATED_SESSIONS });
    expect(Array.isArray(backup.subjects)).toBe(true);
    expect(JSON.stringify(backup)).not.toContain("secret-token");
  });

  it("is replaced by the user's next change to it, which clears the message", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sb-subjects", TRUNCATED_SUBJECTS);
    renderApp();
    expect(screen.queryByRole("alert", { name: /couldn't be read/ })).toBeTruthy();

    await user.click(screen.getAllByRole("checkbox", { name: /^Complete topic / })[0]);
    expect(screen.queryByRole("alert")).toBeNull();
    const stored = JSON.parse(localStorage.getItem("sb-subjects"));
    expect(stored.flatMap((s) => s.topics).some((t) => t.done)).toBe(true);
  });

  it("shows no message when everything stored parses", () => {
    renderApp();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// N17: with storage blocked (every access throws), loadText and removeKey
// threw and the app could not start.
describe("when the browser blocks storage", () => {
  afterEach(() => vi.restoreAllMocks());

  const blockStorage = () => {
    const blocked = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    ["getItem", "setItem", "removeItem", "key", "clear"].forEach((method) =>
      vi.spyOn(Storage.prototype, method).mockImplementation(blocked)
    );
  };

  it("starts, runs in memory and says nothing will be saved", async () => {
    const user = userEvent.setup();
    const downloaded = captureDownload();
    blockStorage();
    renderApp({ onboarded: false });

    expect(screen.getByRole("alert", { name: /nothing you do here will be saved/ })).toBeTruthy();
    // The app is usable: onboarding can be dismissed and the planner works.
    await user.click(screen.getByRole("button", { name: /A-Level example set/ }));
    const box = (await screen.findAllByRole("checkbox", { name: /^Complete topic / }))[0];
    await user.click(box);
    expect(screen.getByRole("button", { name: /Completed \(1\)/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Download a backup" }));
    const backup = await downloaded();
    expect(backup.subjects.flatMap((s) => s.topics).some((t) => t.done)).toBe(true);
  });
});
