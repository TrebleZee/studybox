// The timed topic of an unlogged session, as { subjectId, topicId }, only if
// that topic still exists on the timed subject; otherwise null. A reload and
// an undone timer Reset both use it to bring the topic back.
export const timedTopic = (subjects, subjectId, topicId) => {
  if (typeof subjectId !== "string" || typeof topicId !== "string") return null;
  const subject = subjects.find((item) => item.id === subjectId);
  return subject?.topics.some((topic) => topic.id === topicId) ? { subjectId, topicId } : null;
};

// The note and tags of a saved draft, with anything of the wrong type dropped.
// Read on load, and again when this tab takes over a session from another.
export const draftFields = (saved) => ({
  note: typeof saved?.note === "string" ? saved.note : "",
  tags: Array.isArray(saved?.tags) ? saved.tags.filter((tag) => typeof tag === "string") : [],
});
