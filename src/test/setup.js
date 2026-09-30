import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetUpdateStore } from "../pwa/updateStore.js";

beforeEach(() => {
  localStorage.clear();
  resetUpdateStore();
  document.title = "StudyBox";
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
