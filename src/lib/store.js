const { all, createId, get, nowIso, run, transaction } = require("./db");

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserWithPassword(row) {
  if (!row) {
    return null;
  }

  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
}

function mapProjectSummary(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role: row.role,
    memberCount: Number(row.member_count),
    taskCount: Number(row.task_count),
    todoCount: Number(row.todo_count),
    inProgressCount: Number(row.in_progress_count),
    doneCount: Number(row.done_count),
  };
}

function mapMember(row) {
  return {
    id: row.id,
    role: row.role,
    joinedAt: row.joined_at,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
    },
  };
}

function mapTask(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    assigneeId: row.assignee_id,
    createdById: row.created_by_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignee: row.assignee_user_id
      ? {
          id: row.assignee_user_id,
          name: row.assignee_name,
          email: row.assignee_email,
        }
      : null,
    creator: {
      id: row.creator_user_id,
      name: row.creator_name,
      email: row.creator_email,
    },
    project: row.project_id_join
      ? {
          id: row.project_id_join,
          name: row.project_name,
        }
      : undefined,
  };
}

function touchProject(projectId, timestamp = nowIso()) {
  run(
    `
      UPDATE projects
      SET updated_at = $updatedAt
      WHERE id = $projectId
    `,
    {
      $projectId: projectId,
      $updatedAt: timestamp,
    },
  );
}

function findUserByEmail(email) {
  return mapUserWithPassword(
    get(
      `
        SELECT id, name, email, password_hash, created_at, updated_at
        FROM users
        WHERE email = $email
      `,
      { $email: email },
    ),
  );
}

function findUserById(id) {
  return mapUser(
    get(
      `
        SELECT id, name, email, created_at, updated_at
        FROM users
        WHERE id = $id
      `,
      { $id: id },
    ),
  );
}

function createUser({ name, email, passwordHash }) {
  const id = createId();
  const timestamp = nowIso();

  run(
    `
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES ($id, $name, $email, $passwordHash, $createdAt, $updatedAt)
    `,
    {
      $id: id,
      $name: name,
      $email: email,
      $passwordHash: passwordHash,
      $createdAt: timestamp,
      $updatedAt: timestamp,
    },
  );

  return findUserById(id);
}

function saveUser({ name, email, passwordHash }) {
  const timestamp = nowIso();
  const existingUser = findUserByEmail(email);
  const id = existingUser ? existingUser.id : createId();

  run(
    `
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES ($id, $name, $email, $passwordHash, $createdAt, $updatedAt)
      ON CONFLICT(email)
      DO UPDATE SET
        name = excluded.name,
        password_hash = excluded.password_hash,
        updated_at = excluded.updated_at
    `,
    {
      $id: id,
      $name: name,
      $email: email,
      $passwordHash: passwordHash,
      $createdAt: existingUser ? existingUser.createdAt : timestamp,
      $updatedAt: timestamp,
    },
  );

  return findUserByEmail(email);
}

function getProjectMembership(projectId, userId) {
  return (
    get(
      `
        SELECT id, project_id, user_id, role, joined_at
        FROM project_members
        WHERE project_id = $projectId AND user_id = $userId
      `,
      {
        $projectId: projectId,
        $userId: userId,
      },
    ) || null
  );
}

function createProjectWithAdmin({ name, description, createdById }) {
  return transaction(() => {
    const projectId = createId();
    const membershipId = createId();
    const timestamp = nowIso();

    run(
      `
        INSERT INTO projects (id, name, description, created_by_id, created_at, updated_at)
        VALUES ($id, $name, $description, $createdById, $createdAt, $updatedAt)
      `,
      {
        $id: projectId,
        $name: name,
        $description: description ?? null,
        $createdById: createdById,
        $createdAt: timestamp,
        $updatedAt: timestamp,
      },
    );

    run(
      `
        INSERT INTO project_members (id, project_id, user_id, role, joined_at)
        VALUES ($id, $projectId, $userId, 'ADMIN', $joinedAt)
      `,
      {
        $id: membershipId,
        $projectId: projectId,
        $userId: createdById,
        $joinedAt: timestamp,
      },
    );

    return get(
      `
        SELECT id, name, description, created_by_id, created_at, updated_at
        FROM projects
        WHERE id = $id
      `,
      { $id: projectId },
    );
  });
}

function listProjectsForUser(userId) {
  return all(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        pm.role,
        (SELECT COUNT(*) FROM project_members members WHERE members.project_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM tasks tasks WHERE tasks.project_id = p.id) AS task_count,
        (SELECT COUNT(*) FROM tasks tasks WHERE tasks.project_id = p.id AND tasks.status = 'TODO') AS todo_count,
        (SELECT COUNT(*) FROM tasks tasks WHERE tasks.project_id = p.id AND tasks.status = 'IN_PROGRESS') AS in_progress_count,
        (SELECT COUNT(*) FROM tasks tasks WHERE tasks.project_id = p.id AND tasks.status = 'DONE') AS done_count
      FROM projects p
      INNER JOIN project_members pm
        ON pm.project_id = p.id
      WHERE pm.user_id = $userId
      ORDER BY p.updated_at DESC
    `,
    { $userId: userId },
  ).map(mapProjectSummary);
}

function getProjectDetailForUser(projectId, userId) {
  const projectRow = get(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        pm.role AS current_user_role,
        creator.id AS created_by_id,
        creator.name AS created_by_name,
        creator.email AS created_by_email
      FROM projects p
      INNER JOIN project_members pm
        ON pm.project_id = p.id AND pm.user_id = $userId
      INNER JOIN users creator
        ON creator.id = p.created_by_id
      WHERE p.id = $projectId
    `,
    {
      $projectId: projectId,
      $userId: userId,
    },
  );

  if (!projectRow) {
    return null;
  }

  const members = all(
    `
      SELECT
        pm.id,
        pm.role,
        pm.joined_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email
      FROM project_members pm
      INNER JOIN users u
        ON u.id = pm.user_id
      WHERE pm.project_id = $projectId
      ORDER BY pm.joined_at ASC
    `,
    { $projectId: projectId },
  ).map(mapMember);

  const tasks = all(
    `
      SELECT
        t.id,
        t.project_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.assignee_id,
        t.created_by_id,
        t.created_at,
        t.updated_at,
        assignee.id AS assignee_user_id,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email,
        creator.id AS creator_user_id,
        creator.name AS creator_name,
        creator.email AS creator_email
      FROM tasks t
      LEFT JOIN users assignee
        ON assignee.id = t.assignee_id
      INNER JOIN users creator
        ON creator.id = t.created_by_id
      WHERE t.project_id = $projectId
      ORDER BY CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC, t.created_at DESC
    `,
    { $projectId: projectId },
  ).map(mapTask);

  return {
    id: projectRow.id,
    name: projectRow.name,
    description: projectRow.description,
    createdAt: projectRow.created_at,
    updatedAt: projectRow.updated_at,
    currentUserRole: projectRow.current_user_role,
    createdBy: {
      id: projectRow.created_by_id,
      name: projectRow.created_by_name,
      email: projectRow.created_by_email,
    },
    members,
    tasks,
  };
}

function saveProjectMember({ projectId, userId, role }) {
  const timestamp = nowIso();

  transaction(() => {
    run(
      `
        INSERT INTO project_members (id, project_id, user_id, role, joined_at)
        VALUES ($id, $projectId, $userId, $role, $joinedAt)
        ON CONFLICT(project_id, user_id)
        DO UPDATE SET role = excluded.role
      `,
      {
        $id: createId(),
        $projectId: projectId,
        $userId: userId,
        $role: role,
        $joinedAt: timestamp,
      },
    );

    touchProject(projectId, timestamp);
  });

  return mapMember(
    get(
      `
        SELECT
          pm.id,
          pm.role,
          pm.joined_at,
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email
        FROM project_members pm
        INNER JOIN users u
          ON u.id = pm.user_id
        WHERE pm.project_id = $projectId AND pm.user_id = $userId
      `,
      {
        $projectId: projectId,
        $userId: userId,
      },
    ),
  );
}

function isProjectMember(projectId, userId) {
  return Boolean(getProjectMembership(projectId, userId));
}

function createTask(data) {
  const taskId = createId();
  const timestamp = nowIso();

  transaction(() => {
    run(
      `
        INSERT INTO tasks (
          id,
          project_id,
          title,
          description,
          status,
          priority,
          due_date,
          assignee_id,
          created_by_id,
          created_at,
          updated_at
        )
        VALUES (
          $id,
          $projectId,
          $title,
          $description,
          $status,
          $priority,
          $dueDate,
          $assigneeId,
          $createdById,
          $createdAt,
          $updatedAt
        )
      `,
      {
        $id: taskId,
        $projectId: data.projectId,
        $title: data.title,
        $description: data.description ?? null,
        $status: data.status,
        $priority: data.priority,
        $dueDate: data.dueDate ?? null,
        $assigneeId: data.assigneeId ?? null,
        $createdById: data.createdById,
        $createdAt: timestamp,
        $updatedAt: timestamp,
      },
    );

    touchProject(data.projectId, timestamp);
  });

  return getTaskById(taskId);
}

function getTaskById(taskId) {
  return mapTask(
    get(
      `
        SELECT
          t.id,
          t.project_id,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.due_date,
          t.assignee_id,
          t.created_by_id,
          t.created_at,
          t.updated_at,
          assignee.id AS assignee_user_id,
          assignee.name AS assignee_name,
          assignee.email AS assignee_email,
          creator.id AS creator_user_id,
          creator.name AS creator_name,
          creator.email AS creator_email,
          project.id AS project_id_join,
          project.name AS project_name
        FROM tasks t
        LEFT JOIN users assignee
          ON assignee.id = t.assignee_id
        INNER JOIN users creator
          ON creator.id = t.created_by_id
        INNER JOIN projects project
          ON project.id = t.project_id
        WHERE t.id = $taskId
      `,
      { $taskId: taskId },
    ),
  );
}

function updateTask(taskId, payload) {
  const task = getTaskById(taskId);

  if (!task) {
    return null;
  }

  const columnMap = {
    title: "title",
    description: "description",
    status: "status",
    priority: "priority",
    assigneeId: "assignee_id",
    dueDate: "due_date",
  };

  const updates = [];
  const params = {
    $taskId: taskId,
    $updatedAt: nowIso(),
  };

  Object.entries(payload).forEach(([key, value]) => {
    if (!(key in columnMap)) {
      return;
    }

    const parameterName = `$${key}`;
    updates.push(`${columnMap[key]} = ${parameterName}`);
    params[parameterName] = value;
  });

  if (!updates.length) {
    return task;
  }

  transaction(() => {
    run(
      `
        UPDATE tasks
        SET ${updates.join(", ")}, updated_at = $updatedAt
        WHERE id = $taskId
      `,
      params,
    );

    touchProject(task.projectId, params.$updatedAt);
  });

  return getTaskById(taskId);
}

function getDashboardForUser(userId) {
  const projects = listProjectsForUser(userId);

  const assignedTasks = all(
    `
      SELECT
        t.id,
        t.title,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.updated_at,
        p.id AS project_id,
        p.name AS project_name
      FROM tasks t
      INNER JOIN projects p
        ON p.id = t.project_id
      WHERE t.assignee_id = $userId
      ORDER BY CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, t.due_date ASC, t.created_at DESC
    `,
    { $userId: userId },
  ).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: {
      id: row.project_id,
      name: row.project_name,
    },
  }));

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const overdueTasks = assignedTasks.filter(
    (task) => task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < now,
  );
  const dueSoonTasks = assignedTasks.filter(
    (task) =>
      task.dueDate &&
      task.status !== "DONE" &&
      new Date(task.dueDate) >= now &&
      new Date(task.dueDate) <= nextWeek,
  );

  return {
    summary: {
      accessibleProjects: projects.length,
      adminProjects: projects.filter((project) => project.role === "ADMIN").length,
      assignedTasks: assignedTasks.length,
      todoTasks: assignedTasks.filter((task) => task.status === "TODO").length,
      inProgressTasks: assignedTasks.filter((task) => task.status === "IN_PROGRESS").length,
      completedTasks: assignedTasks.filter((task) => task.status === "DONE").length,
      overdueTasks: overdueTasks.length,
    },
    assignedTasks,
    overdueTasks,
    dueSoonTasks,
    projects,
  };
}

module.exports = {
  createTask,
  createProjectWithAdmin,
  createUser,
  findUserByEmail,
  findUserById,
  getDashboardForUser,
  getProjectDetailForUser,
  getProjectMembership,
  getTaskById,
  isProjectMember,
  listProjectsForUser,
  saveUser,
  saveProjectMember,
  updateTask,
};
