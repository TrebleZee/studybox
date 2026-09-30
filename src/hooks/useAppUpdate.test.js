import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markUpdateReady } from "../pwa/updateStore.js";
import useAppUpdate from "./useAppUpdate.js";

describe("useAppUpdate", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const setup = (sessionInProgress) =>
    renderHook((props) => useAppUpdate(props), { initialProps: { sessionInProgress } });

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

    rerender({ sessionInProgress: false });
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
