import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  localStorage.clear();
  document.title = "StudyBox";
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
