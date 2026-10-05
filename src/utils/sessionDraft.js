// The timed topic of an unlogged session, as { subjectId, topicId }, only if
// that topic still exists on the timed subject; otherwise null. A reload and
// an undone timer Reset both use it to bring the topic back.
export const timedTopic = (subjects, subjectId, topicId) => {
  if (typeof subjectId !== "string" || typeof topicId !== "string") return null;
  const subject = subjects.find((item) => item.id === subjectId);
  return subject?.topics.some((topic) => topic.id === topicId) ? { subjectId, topicId } : null;
};
