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

const fillStorage = () =>
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  });

const banner = () => screen.queryByRole("alert", { name: /Couldn't save/ });

describe("when storage is full", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the app running, says so, and can still export what's on screen", async () => {
    const user = userEvent.setup();
    const downloaded = captureDownload();
    localStorage.setItem("studybox_asana_pat", "1/secret-token");
    renderApp();
    const box = screen.getAllByRole("checkbox", { name: /^Complete topic / })[0];
    const topic = box.getAttribute("aria-label").replace("Complete topic ", "");

    const full = fillStorage();
    await user.click(box);
    full.mockRestore();

    // Still mounted and showing the change, which never reached storage.
    expect(screen.getByRole("button", { name: /Completed \(1\)/ })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("sb-subjects")).flatMap((s) => s.topics).find((t) => t.name === topic).done).toBe(false);
    expect(banner().textContent).toContain("Couldn't save your last change");

    await user.click(screen.getByRole("button", { name: "Download a backup" }));
    const backup = await downloaded();
    expect(backup.subjects.flatMap((s) => s.topics).find((t) => t.name === topic).done).toBe(true);
    expect(JSON.stringify(backup)).not.toContain("secret-token");
  });

  it("clears the banner once the change is saved", async () => {
    const user = userEvent.setup();
    renderApp();
    const full = fillStorage();
    await user.click(screen.getAllByRole("checkbox", { name: /^Complete topic / })[0]);
    expect(banner()).toBeTruthy();
    full.mockRestore();

    await user.click(screen.getAllByRole("checkbox", { name: /^Complete topic / })[0]);
    expect(banner()).toBeNull();
  });
});
