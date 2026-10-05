import { describe, expect, it } from "vitest";
import { timedTopic } from "./sessionDraft.js";

const subjects = [
  { id: "cs", topics: [{ id: "t1" }, { id: "t2" }] },
  { id: "maths", topics: [] },
];

describe("timedTopic", () => {
  it("returns the topic when it is still on the timed subject", () => {
    expect(timedTopic(subjects, "cs", "t2")).toEqual({ subjectId: "cs", topicId: "t2" });
  });

  it("returns null for a topic, or a subject, that is gone", () => {
    expect(timedTopic(subjects, "cs", "t9")).toBeNull();
    expect(timedTopic(subjects, "maths", "t1")).toBeNull();
    expect(timedTopic(subjects, "gone", "t1")).toBeNull();
  });

  it("returns null when nothing was timed or the stored values aren't ids", () => {
    expect(timedTopic(subjects, null, "t1")).toBeNull();
    expect(timedTopic(subjects, "cs", null)).toBeNull();
    expect(timedTopic(subjects, "cs", { id: "t1" })).toBeNull();
    expect(timedTopic(subjects, "__proto__", "constructor")).toBeNull();
  });
});
