const express = require("express");
const { asyncHandler, AppError } = require("../lib/errors");
const { requireProjectAdmin, requireProjectMembership } = require("../lib/project-access");
const {
  createProjectWithAdmin,
  createTask,
  findUserByEmail,
  getProjectDetailForUser,
  isProjectMember,
  listProjectsForUser,
  saveProjectMember,
} = require("../lib/store");
const { memberSchema, projectSchema, taskCreateSchema, validate } = require("../lib/validation");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({
      projects: listProjectsForUser(req.user.id),
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = validate(projectSchema, req.body);

    const project = createProjectWithAdmin({
      name: input.name,
      description: input.description,
      createdById: req.user.id,
    });

    res.status(201).json({
      message: "Project created successfully.",
      project,
    });
  }),
);

router.get(
  "/:projectId",
  asyncHandler(async (req, res) => {
    await requireProjectMembership(req.params.projectId, req.user.id);
    const project = getProjectDetailForUser(req.params.projectId, req.user.id);

    if (!project) {
      throw new AppError(404, "Project not found.");
    }

    res.json({
      project,
    });
  }),
);

router.post(
  "/:projectId/members",
  asyncHandler(async (req, res) => {
    await requireProjectAdmin(req.params.projectId, req.user.id);

    const input = validate(memberSchema, req.body);

    const user = findUserByEmail(input.email);

    if (!user) {
      throw new AppError(404, "That user does not exist yet. Ask them to sign up first.");
    }

    const membership = saveProjectMember({
      projectId: req.params.projectId,
      userId: user.id,
      role: input.role,
    });

    res.status(201).json({
      message: "Team member saved successfully.",
      membership,
    });
  }),
);

router.post(
  "/:projectId/tasks",
  asyncHandler(async (req, res) => {
    await requireProjectAdmin(req.params.projectId, req.user.id);

    const input = validate(taskCreateSchema, req.body);

    if (input.assigneeId) {
      if (!isProjectMember(req.params.projectId, input.assigneeId)) {
        throw new AppError(400, "The selected assignee is not part of this project.");
      }
    }

    const task = createTask({
      projectId: req.params.projectId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ? input.dueDate.toISOString() : null,
      createdById: req.user.id,
    });

    res.status(201).json({
      message: "Task created successfully.",
      task,
    });
  }),
);

module.exports = { projectRouter: router };
