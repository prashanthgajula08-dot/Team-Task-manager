const bcrypt = require("bcryptjs");
require("../src/lib/env");
const {
  createTask,
  createProjectWithAdmin,
  getProjectDetailForUser,
  listProjectsForUser,
  saveUser,
  saveProjectMember,
} = require("../src/lib/store");

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = saveUser({
    name: "Demo Admin",
    email: "admin@demo.com",
    passwordHash,
  });

  const member = saveUser({
    name: "Demo Member",
    email: "member@demo.com",
    passwordHash,
  });

  const existingProject = listProjectsForUser(admin.id).find(
    (item) => item.name === "Product Launch Sprint",
  );

  let project = existingProject
    ? getProjectDetailForUser(existingProject.id, admin.id)
    : null;

  if (!existingProject || !project) {
    const createdProject = createProjectWithAdmin({
      name: "Product Launch Sprint",
      description: "Shared demo project for showcasing role-based task management.",
      createdById: admin.id,
    });
    project = getProjectDetailForUser(createdProject.id, admin.id);
  }

  saveProjectMember({
    projectId: project.id,
    userId: admin.id,
    role: "ADMIN",
  });

  saveProjectMember({
    projectId: project.id,
    userId: member.id,
    role: "MEMBER",
  });

  if (project.tasks.length === 0) {
    createTask({
      projectId: project.id,
      title: "Publish launch landing page",
      description: "Ship the final version of the landing page before the campaign starts.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      assigneeId: member.id,
      createdById: admin.id,
    });

    createTask({
      projectId: project.id,
      title: "QA signup flow",
      description: "Validate forms, auth errors, and success redirects.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      assigneeId: member.id,
      createdById: admin.id,
    });
  }

  console.log("Demo data created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
