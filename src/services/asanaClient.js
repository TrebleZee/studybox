// Verified in-browser (Step 0): Asana's API answers cross-origin requests
// with real HTTP statuses, so direct calls work — no proxy needed.
const ASANA_API_BASE = "https://app.asana.com/api/1.0";

export const ASANA_DEFAULTS = {
  id: "asana",
  name: "NEA Tasks",
  exam: "Asana",
  color: "#F06A6A",
  projectGid: "1216591284200162",
};

export const normalizeAsanaConfig = (input) => ({
  id: ASANA_DEFAULTS.id,
  name:
    typeof input?.name === "string" && input.name.trim()
      ? input.name
      : ASANA_DEFAULTS.name,
  exam:
    typeof input?.exam === "string" && input.exam.trim()
      ? input.exam
      : ASANA_DEFAULTS.exam,
  color:
    typeof input?.color === "string" && input.color
      ? input.color
      : ASANA_DEFAULTS.color,
  projectGid:
    typeof input?.projectGid === "string" && input.projectGid.trim()
      ? input.projectGid.trim()
      : ASANA_DEFAULTS.projectGid,
});

const TOKEN_KEY = "studybox_asana_pat";

export function getAsanaToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAsanaToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function hasAsanaToken() {
  return Boolean(getAsanaToken());
}

async function asanaFetch(path, { method = "GET", body } = {}) {
  const token = getAsanaToken();
  if (!token) throw new Error("No Asana token set");

  const response = await fetch(`${ASANA_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify({ data: body }) } : {}),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Asana API error ${response.status}: ${errBody}`);
  }

  const json = await response.json();
  return json.data;
}

const mapTask = (t) => ({
  gid: t.gid,
  name: t.name,
  completed: Boolean(t.completed),
  dueOn: t.due_on,
  section: t.memberships?.[0]?.section?.name ?? "No section",
  url: t.permalink_url,
  overdue:
    !t.completed && t.due_on
      ? new Date(t.due_on) < new Date(new Date().toDateString())
      : false,
});

const byDueDate = (a, b) => {
  if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
  if (a.dueOn) return -1;
  if (b.dueOn) return 1;
  return 0;
};

// Only returns top-level tasks in the project — subtasks (the granular
// TASK-nn items attached under each milestone by a separate planning tool)
// are excluded automatically, so this stays readable as the backlog grows.
// Completed tasks are fetched too (no completed_since filter) so progress
// can be estimated from the completed/total fraction.
export async function getAsanaTasks(projectGid = ASANA_DEFAULTS.projectGid) {
  const fields = [
    "name",
    "completed",
    "due_on",
    "start_on",
    "memberships.section.name",
    "permalink_url",
  ].join(",");

  const all = await asanaFetch(
    `/projects/${projectGid}/tasks?opt_fields=${fields}`
  );

  const mapped = all.map(mapTask);
  const tasks = mapped.filter((t) => !t.completed).sort(byDueDate);
  const completedTasks = mapped.filter((t) => t.completed).sort(byDueDate);

  return {
    tasks,
    completedTasks,
    stats: { completed: completedTasks.length, total: mapped.length },
  };
}

export async function getSubtasks(taskGid) {
  const fields = ["name", "completed", "due_on", "permalink_url"].join(",");
  const subtasks = await asanaFetch(
    `/tasks/${taskGid}/subtasks?opt_fields=${fields}`
  );
  return subtasks.map(mapTask);
}

export function setTaskCompleted(taskGid, completed) {
  return asanaFetch(`/tasks/${taskGid}`, {
    method: "PUT",
    body: { completed },
  });
}
