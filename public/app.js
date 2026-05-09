const state = {
  user: null,
  dashboard: null,
  projects: [],
  selectedProject: null,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  captureElements();
  bindEvents();
  hydrateSession();
});

function captureElements() {
  els.statusBanner = document.getElementById("status-banner");
  els.authView = document.getElementById("auth-view");
  els.appView = document.getElementById("app-view");
  els.loginForm = document.getElementById("login-form");
  els.signupForm = document.getElementById("signup-form");
  els.logoutButton = document.getElementById("logout-button");
  els.userChip = document.getElementById("user-chip");
  els.summaryCards = document.getElementById("summary-cards");
  els.dueSoonList = document.getElementById("due-soon-list");
  els.overdueList = document.getElementById("overdue-list");
  els.projectList = document.getElementById("project-list");
  els.createProjectForm = document.getElementById("create-project-form");
  els.emptyProjectState = document.getElementById("empty-project-state");
  els.projectContent = document.getElementById("project-content");
  els.projectHeader = document.getElementById("project-header");
  els.taskList = document.getElementById("task-list");
  els.memberList = document.getElementById("member-list");
  els.roleNote = document.getElementById("project-role-note");
  els.adminTools = document.getElementById("admin-tools");
  els.addMemberForm = document.getElementById("add-member-form");
  els.createTaskForm = document.getElementById("create-task-form");
  els.taskAssigneeSelect = document.getElementById("task-assignee-select");
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.signupForm.addEventListener("submit", handleSignup);
  els.logoutButton.addEventListener("click", handleLogout);
  els.createProjectForm.addEventListener("submit", handleProjectCreate);
  els.addMemberForm.addEventListener("submit", handleMemberCreate);
  els.createTaskForm.addEventListener("submit", handleTaskCreate);

  els.projectList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-id]");

    if (!button) {
      return;
    }

    loadProject(button.dataset.projectId);
  });

  els.taskList.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-task-update-form]");

    if (!form) {
      return;
    }

    event.preventDefault();
    handleTaskUpdate(form);
  });
}

async function hydrateSession() {
  try {
    const response = await api("/api/auth/me");
    state.user = response.user;
    await refreshWorkspace();
  } catch (_error) {
    state.user = null;
    renderAuthState();
  }
}

async function handleLogin(event) {
  event.preventDefault();

  try {
    const payload = formToJson(els.loginForm);
    const response = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    state.user = response.user;
    els.loginForm.reset();
    showStatus("Logged in successfully.", "success");
    await refreshWorkspace();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function handleSignup(event) {
  event.preventDefault();

  try {
    const payload = formToJson(els.signupForm);
    const response = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    state.user = response.user;
    els.signupForm.reset();
    showStatus("Account created. You are now logged in.", "success");
    await refreshWorkspace();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (_error) {
    // Ignore logout cleanup failures.
  }

  state.user = null;
  state.dashboard = null;
  state.projects = [];
  state.selectedProject = null;
  renderAuthState();
  showStatus("You have been logged out.", "success");
}

async function handleProjectCreate(event) {
  event.preventDefault();

  try {
    const payload = formToJson(els.createProjectForm);
    const response = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    els.createProjectForm.reset();
    showStatus(response.message, "success");
    await refreshWorkspace(response.project.id);
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function handleMemberCreate(event) {
  event.preventDefault();

  if (!state.selectedProject) {
    showStatus("Select a project first.", "error");
    return;
  }

  try {
    const payload = formToJson(els.addMemberForm);
    const response = await api(`/api/projects/${state.selectedProject.id}/members`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    els.addMemberForm.reset();
    showStatus(response.message, "success");
    await refreshWorkspace(state.selectedProject.id);
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function handleTaskCreate(event) {
  event.preventDefault();

  if (!state.selectedProject) {
    showStatus("Select a project first.", "error");
    return;
  }

  try {
    const payload = formToJson(els.createTaskForm);
    const response = await api(`/api/projects/${state.selectedProject.id}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    els.createTaskForm.reset();
    els.taskAssigneeSelect.innerHTML = '<option value="">Unassigned</option>';
    showStatus(response.message, "success");
    await refreshWorkspace(state.selectedProject.id);
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function handleTaskUpdate(form) {
  const taskId = form.dataset.taskUpdateForm;

  try {
    const payload = formToJson(form);
    const response = await api(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    showStatus(response.message, "success");
    await refreshWorkspace(state.selectedProject ? state.selectedProject.id : null);
  } catch (error) {
    showStatus(error.message, "error");
  }
}

async function refreshWorkspace(preferredProjectId = null) {
  const [dashboardData, projectData] = await Promise.all([
    api("/api/dashboard"),
    api("/api/projects"),
  ]);

  state.dashboard = dashboardData;
  state.projects = projectData.projects;

  const fallbackProjectId =
    preferredProjectId && state.projects.some((project) => project.id === preferredProjectId)
      ? preferredProjectId
      : state.selectedProject && state.projects.some((project) => project.id === state.selectedProject.id)
        ? state.selectedProject.id
        : state.projects[0]
          ? state.projects[0].id
          : null;

  renderAppShell();

  if (fallbackProjectId) {
    await loadProject(fallbackProjectId, { silent: true });
  } else {
    state.selectedProject = null;
    renderSelectedProject();
  }
}

async function loadProject(projectId, options = {}) {
  try {
    const response = await api(`/api/projects/${projectId}`);
    state.selectedProject = response.project;
    renderProjects();
    renderSelectedProject();

    if (!options.silent) {
      showStatus(`Loaded ${response.project.name}.`, "success");
    }
  } catch (error) {
    showStatus(error.message, "error");
  }
}

function renderAuthState() {
  const isLoggedIn = Boolean(state.user);

  els.authView.classList.toggle("hidden", isLoggedIn);
  els.appView.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    els.summaryCards.innerHTML = "";
    els.dueSoonList.innerHTML = "";
    els.overdueList.innerHTML = "";
    els.projectList.innerHTML = "";
    els.memberList.innerHTML = "";
    els.taskList.innerHTML = "";
    els.projectHeader.innerHTML = "";
  }
}

function renderAppShell() {
  renderAuthState();

  if (!state.user) {
    return;
  }

  els.userChip.textContent = `${state.user.name} · ${state.user.email}`;

  renderSummaryCards();
  renderTaskFeed(els.dueSoonList, state.dashboard.dueSoonTasks, "Nothing due in the next 7 days.");
  renderTaskFeed(els.overdueList, state.dashboard.overdueTasks, "No overdue tasks. Nice work.");
  renderProjects();
}

function renderSummaryCards() {
  const summary = state.dashboard.summary;
  const cards = [
    ["Projects", summary.accessibleProjects],
    ["Admin Projects", summary.adminProjects],
    ["Assigned", summary.assignedTasks],
    ["Todo", summary.todoTasks],
    ["In Progress", summary.inProgressTasks],
    ["Completed", summary.completedTasks],
    ["Overdue", summary.overdueTasks],
  ];

  els.summaryCards.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="summary-card">
          <h3>${escapeHtml(String(value))}</h3>
          <p>${escapeHtml(label)}</p>
        </article>
      `,
    )
    .join("");
}

function renderTaskFeed(container, tasks, emptyMessage) {
  if (!tasks.length) {
    container.innerHTML = `<div class="feed-empty">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  container.innerHTML = tasks
    .map(
      (task) => `
        <article class="task-item">
          <strong>${escapeHtml(task.title)}</strong>
          <small>${escapeHtml(task.project.name)} · ${formatDate(task.dueDate)}</small>
          <div class="project-tile-meta">
            ${statusPill(task.status)}
            ${priorityPill(task.priority)}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderProjects() {
  if (!state.projects.length) {
    els.projectList.innerHTML = `<div class="feed-empty">No projects yet. Create one to get started.</div>`;
    return;
  }

  els.projectList.innerHTML = state.projects
    .map((project) => {
      const isActive = state.selectedProject && state.selectedProject.id === project.id;

      return `
        <button
          type="button"
          class="project-tile ${isActive ? "active" : ""}"
          data-project-id="${escapeHtml(project.id)}"
        >
          <strong>${escapeHtml(project.name)}</strong>
          <small>${escapeHtml(project.description || "No description added yet.")}</small>
          <div class="project-tile-meta">
            <span class="pill">${escapeHtml(project.role)}</span>
            <span class="pill">${project.memberCount} members</span>
            <span class="pill">${project.taskCount} tasks</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderSelectedProject() {
  if (!state.selectedProject) {
    els.emptyProjectState.classList.remove("hidden");
    els.projectContent.classList.add("hidden");
    els.memberList.innerHTML = `<div class="feed-empty">No team loaded yet.</div>`;
    els.roleNote.textContent = "Project permissions appear here once you select a project.";
    els.adminTools.classList.add("hidden");
    syncAssigneeOptions([]);
    return;
  }

  els.emptyProjectState.classList.add("hidden");
  els.projectContent.classList.remove("hidden");

  const project = state.selectedProject;
  const adminView = project.currentUserRole === "ADMIN";
  const todoCount = project.tasks.filter((task) => task.status === "TODO").length;
  const inProgressCount = project.tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const doneCount = project.tasks.filter((task) => task.status === "DONE").length;

  els.projectHeader.innerHTML = `
    <article class="project-header-card">
      <p class="eyebrow">Selected Project</p>
      <h2>${escapeHtml(project.name)}</h2>
      <p>${escapeHtml(project.description || "No description added yet.")}</p>
      <div class="project-stats">
        <span class="pill">${escapeHtml(project.currentUserRole)}</span>
        <span class="pill">${project.members.length} teammates</span>
        <span class="pill">${project.tasks.length} tasks</span>
        <span class="pill status-todo">${todoCount} todo</span>
        <span class="pill status-progress">${inProgressCount} in progress</span>
        <span class="pill status-done">${doneCount} done</span>
      </div>
    </article>
  `;

  els.roleNote.textContent = adminView
    ? "You are an admin on this project. You can add members, create tasks, and update any task."
    : "You are a member on this project. You can update the status of tasks assigned to you.";

  els.adminTools.classList.toggle("hidden", !adminView);
  renderMembers(project.members);
  renderTaskBoard(project.tasks, project.members, adminView);
  syncAssigneeOptions(project.members);
}

function renderMembers(members) {
  els.memberList.innerHTML = members
    .map(
      (member) => `
        <article class="member-item">
          <div>
            <strong>${escapeHtml(member.user.name)}</strong>
            <small>${escapeHtml(member.user.email)}</small>
          </div>
          <span class="member-role">${escapeHtml(member.role)}</span>
        </article>
      `,
    )
    .join("");
}

function renderTaskBoard(tasks, members, adminView) {
  if (!tasks.length) {
    els.taskList.innerHTML = `<div class="feed-empty">No tasks yet. ${adminView ? "Create one from the right panel." : "Ask an admin to assign one."}</div>`;
    return;
  }

  els.taskList.innerHTML = tasks
    .map((task) => {
      const canEdit = adminView || task.assigneeId === state.user.id;
      const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

      return `
        <article class="task-card ${isOverdue ? "overdue" : ""}">
          <div class="task-card-head">
            <div>
              <p class="eyebrow">Task</p>
              <h3>${escapeHtml(task.title)}</h3>
            </div>
            ${statusPill(task.status)}
          </div>

          <p>${escapeHtml(task.description || "No extra details provided.")}</p>

          <div class="meta-row">
            <span>Assignee: ${escapeHtml(task.assignee ? task.assignee.name : "Unassigned")}</span>
            <span>Priority: ${escapeHtml(sentenceCase(task.priority))}</span>
            <span>Due: ${formatDate(task.dueDate)}</span>
            <span>Created by: ${escapeHtml(task.creator.name)}</span>
          </div>

          ${
            canEdit
              ? `
                <form class="task-editor" data-task-update-form="${escapeHtml(task.id)}">
                  ${
                    adminView
                      ? `
                        <div class="task-editor-grid">
                          <label>
                            <span>Status</span>
                            <select name="status">
                              ${taskStatusOptions(task.status)}
                            </select>
                          </label>
                          <label>
                            <span>Priority</span>
                            <select name="priority">
                              ${taskPriorityOptions(task.priority)}
                            </select>
                          </label>
                          <label>
                            <span>Assignee</span>
                            <select name="assigneeId">
                              <option value="">Unassigned</option>
                              ${members
                                .map(
                                  (member) => `
                                    <option value="${escapeHtml(member.user.id)}" ${
                                      task.assigneeId === member.user.id ? "selected" : ""
                                    }>
                                      ${escapeHtml(member.user.name)}
                                    </option>
                                  `,
                                )
                                .join("")}
                            </select>
                          </label>
                        </div>
                      `
                      : `
                        <label>
                          <span>Status</span>
                          <select name="status">
                            ${taskStatusOptions(task.status)}
                          </select>
                        </label>
                      `
                  }
                  <button type="submit" class="secondary-button">Save Update</button>
                </form>
              `
              : `
                <div class="info-banner">Read-only for you. Members can update only their own assigned tasks.</div>
              `
          }
        </article>
      `;
    })
    .join("");
}

function syncAssigneeOptions(members) {
  const options = ['<option value="">Unassigned</option>']
    .concat(
      members.map(
        (member) =>
          `<option value="${escapeHtml(member.user.id)}">${escapeHtml(member.user.name)} · ${escapeHtml(member.role)}</option>`,
      ),
    )
    .join("");

  els.taskAssigneeSelect.innerHTML = options;
}

function taskStatusOptions(selectedValue) {
  return ["TODO", "IN_PROGRESS", "DONE"]
    .map(
      (value) => `
        <option value="${value}" ${selectedValue === value ? "selected" : ""}>
          ${escapeHtml(sentenceCase(value))}
        </option>
      `,
    )
    .join("");
}

function taskPriorityOptions(selectedValue) {
  return ["LOW", "MEDIUM", "HIGH"]
    .map(
      (value) => `
        <option value="${value}" ${selectedValue === value ? "selected" : ""}>
          ${escapeHtml(sentenceCase(value))}
        </option>
      `,
    )
    .join("");
}

function statusPill(status) {
  const className =
    status === "TODO" ? "status-todo" : status === "IN_PROGRESS" ? "status-progress" : "status-done";

  return `<span class="pill ${className}">${escapeHtml(sentenceCase(status))}</span>`;
}

function priorityPill(priority) {
  const className =
    priority === "HIGH" ? "priority-high" : priority === "MEDIUM" ? "priority-medium" : "priority-low";

  return `<span class="pill ${className}">${escapeHtml(sentenceCase(priority))}</span>`;
}

function formToJson(form) {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function formatDate(value) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function sentenceCase(value) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showStatus(message, type) {
  els.statusBanner.textContent = message;
  els.statusBanner.className = `status-banner status-${type}`;
  clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = window.setTimeout(() => {
    els.statusBanner.className = "status-banner hidden";
  }, 3200);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}
