import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditSessionModal from "./EditSessionModal.jsx";

const C = { s1: "#111", s2: "#222", s3: "#333", bdr: "#444", bdr2: "#555", txt: "#fff", muted: "#999" };
const subjects = [{ id: "physics", name: "Physics", color: "#f00", qualification: "other", board: "Custom", exam: "Test" }];
const asanaCfg = { id: "asana", name: "Asana", color: "#0f0", exam: "Tasks", enabled: false };

const sessionOf = (id, duration) => ({
  id,
  subjectId: "physics",
  subjectName: "Physics",
  subjectColor: "#f00",
  duration,
  date: "2026-06-19T09:00:00.000Z",
  note: "",
  tags: [],
});

const saveOf = (duration, change) => {
  const onSave = vi.fn();
  render(
    <EditSessionModal
      C={C}
      session={sessionOf("s1", duration)}
      subjects={subjects}
      asanaCfg={asanaCfg}
      onSave={onSave}
      onClose={() => {}}
    />
  );
  change?.();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  return onSave.mock.calls[0][1].duration;
};

describe("EditSessionModal duration", () => {
  it.each([45, 1559])("keeps the stored %i s when saved unchanged", (duration) => {
    expect(saveOf(duration)).toBe(duration);
  });

  it("keeps the seconds when only the note changes", () => {
    const duration = saveOf(1559, () =>
      fireEvent.change(screen.getByPlaceholderText("Optional session notes"), { target: { value: "x" } })
    );
    expect(duration).toBe(1559);
  });

  it("sets the new duration when minutes change", () => {
    const duration = saveOf(1559, () =>
      fireEvent.change(screen.getByDisplayValue("25"), { target: { value: "30" } })
    );
    expect(duration).toBe(1800);
  });

  it("sets the new duration when hours change", () => {
    const duration = saveOf(1559, () => {
      fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "2" } });
    });
    expect(duration).toBe(2 * 3600 + 25 * 60);
  });
});
