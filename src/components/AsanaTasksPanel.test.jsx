import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASANA_DEFAULTS } from "../services/asanaClient.js";
import AnalysisPanel from "./AnalysisPanel.jsx";
import AsanaTasksPanel from "./AsanaTasksPanel.jsx";

const C = {
  bdr: "#272727",
  bdr2: "#333333",
  s1: "#131313",
  s2: "#1A1A1A",
  s3: "#222222",
  txt: "#F0F0F0",
  muted: "#5A5A5A",
  dim: "#353535",
};

describe("AsanaTasksPanel offline behaviour", () => {
  beforeEach(() => {
    localStorage.setItem("studybox_asana_pat", "a-token");
  });

  it("shows a visible network error instead of crashing when fetch fails offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch")))
    );

    render(
      <div>
        <span>sibling content</span>
        <AsanaTasksPanel
          C={C}
          cfg={{ ...ASANA_DEFAULTS, enabled: true, projectGid: "123" }}
          onStats={() => {}}
          selectedGid={null}
          onSelectTask={() => {}}
        />
      </div>
    );

    expect(
      await screen.findByText("Network error reaching Asana. Check your connection.")
    ).toBeTruthy();
    // The rest of the tree rendered fine; the failure is contained to this panel.
    expect(screen.getByText("sibling content")).toBeTruthy();
  });

  it("does not crash the Analysis view when Asana stats are unavailable offline", () => {
    expect(() =>
      render(
        <AnalysisPanel
          subjects={[]}
          sessions={[]}
          asanaCfg={{ ...ASANA_DEFAULTS, enabled: true }}
          asanaStats={null}
          game={{ currentStreak: 0, longestStreak: 0, totalXP: 0, freezesUsed: 0 }}
          C={C}
        />
      )
    ).not.toThrow();
    expect(screen.getByText("Study Analysis")).toBeTruthy();
  });
});
