import { afterEach, beforeEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import { resetUpdateStore } from "../pwa/updateStore.js";

// findBy*/waitFor poll until the condition holds and return at once, so this is
// only the deadline for work that does finish: reading a backup file (FileReader),
// rendering two Apps, importing a spec chunk for the first time. Under a loaded
// CPU (a full run, CI) those take longer than the 1000 ms default; a condition
// that is really wrong still fails here, just later. Must stay below testTimeout.
configure({ asyncUtilTimeout: 10000 });

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
