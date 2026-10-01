import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markUpdateReady } from "../pwa/updateStore.js";
import useAppUpdate from "./useAppUpdate.js";

describe("useAppUpdate", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const setup = (sessionInProgress, idle = true) =>
    renderHook((props) => useAppUpdate(props), { initialProps: { sessionInProgress, idle } });

  const addField = (tag, value, attrs = {}) => {
    const field = document.createElement(tag);
    Object.entries(attrs).forEach(([key, val]) => field.setAttribute(key, val));
    field.value = value;
    document.body.appendChild(field);
    return field;
  };

  // R2: reloading away from the idle planner can lose unsaved forms (adding a
  // subject, a spec PDF import, onboarding), none of which are persisted.
  it("waits until the app is back on the idle planner", () => {
    const apply = vi.fn();
    const { rerender } = setup(false, false);

    act(() => markUpdateReady(apply));
    act(() => vi.advanceTimersByTime(60 * 1000));
    expect(apply).not.toHaveBeenCalled();

    rerender({ sessionInProgress: false, idle: true });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("waits while a field holds unsaved text, then retries", () => {
    const apply = vi.fn();
    const field = addField("input", "Further Maths");
    setup(false);

    act(() => markUpdateReady(apply));
    act(() => vi.advanceTimersByTime(30 * 1000));
    expect(apply).not.toHaveBeenCalled();

    field.value = "";
    act(() => vi.advanceTimersByTime(30 * 1000));
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("waits while the user is typing in a field", () => {
    const apply = vi.fn();
    addField("textarea", "").focus();
    setup(false);

    act(() => markUpdateReady(apply));
    expect(apply).not.toHaveBeenCalled();
  });

  it("ignores fields whose text is saved across a reload", () => {
    const apply = vi.fn();
    addField("textarea", "Chapter 3", { "data-autosaved": "" });
    addField("input", "on", { type: "checkbox" });
    setup(false);

    act(() => markUpdateReady(apply));
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("does nothing until an update is ready", () => {
    const { result } = setup(false);
    expect(result.current.updateReady).toBe(false);
  });

  it("applies an update straight away when no session is in progress", () => {
    const apply = vi.fn();
    const { result } = setup(false);

    act(() => markUpdateReady(apply));

    expect(result.current.updateReady).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("waits for the session to end before applying", () => {
    const apply = vi.fn();
    const { rerender } = setup(true);

    act(() => markUpdateReady(apply));
    act(() => vi.advanceTimersByTime(60 * 1000));
    expect(apply).not.toHaveBeenCalled();

    rerender({ sessionInProgress: false, idle: true });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("waits while a dialog is open, then retries", () => {
    const apply = vi.fn();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    setup(false);

    act(() => markUpdateReady(apply));
    expect(apply).not.toHaveBeenCalled();

    dialog.remove();
    act(() => vi.advanceTimersByTime(30 * 1000));
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("lets the user apply the update mid-session", () => {
    const apply = vi.fn();
    const { result } = setup(true);

    act(() => markUpdateReady(apply));
    result.current.applyNow();
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
