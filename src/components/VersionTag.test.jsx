import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { version } from "../../package.json";
import { goTo, renderApp } from "../test/helpers.jsx";

describe("version tag", () => {
  it("shows the package version on every view", async () => {
    const user = userEvent.setup();
    renderApp();

    for (const view of ["Planner", "Log", "Analysis", "Settings"]) {
      await goTo(user, view);
      expect(screen.getByText(`v${version}`)).toBeTruthy();
    }
  });

  it("shows the version during onboarding", () => {
    renderApp({ onboarded: false });
    expect(screen.getByText("Welcome to StudyBox")).toBeTruthy();
    expect(screen.getByText(`v${version}`)).toBeTruthy();
  });
});
