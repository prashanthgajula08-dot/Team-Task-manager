const express = require("express");
const { asyncHandler, AppError } = require("../lib/errors");
const { requireProjectMembership } = require("../lib/project-access");
const { getTaskById, isProjectMember, updateTask } = require("../lib/store");
const { adminTaskUpdateSchema, memberTaskUpdateSchema, validate } = require("../lib/validation");

const router = express.Router();

router.patch(
  "/:taskId",
  asyncHandler(async (req, res) => {
    const task = getTaskById(req.params.taskId);

    if (!task) {
      throw new AppError(404, "Task not found.");
    }

    const membership = await requireProjectMembership(task.projectId, req.user.id);
    const isAdmin = membership.role === "ADMIN";

    if (!isAdmin && task.assigneeId !== req.user.id) {
      throw new AppError(403, "Members can only update tasks assigned to them.");
    }

    const payload = isAdmin
      ? validate(adminTaskUpdateSchema, req.body)
      : validate(memberTaskUpdateSchema, req.body);

    if (isAdmin && payload.assigneeId) {
      if (!isProjectMember(task.projectId, payload.assigneeId)) {
        throw new AppError(400, "The selected assignee is not part of this project.");
      }
    }

    const normalizedPayload = { ...payload };

    if (normalizedPayload.dueDate instanceof Date) {
      normalizedPayload.dueDate = normalizedPayload.dueDate.toISOString();
    }

    const updatedTask = updateTask(task.id, normalizedPayload);

    res.json({
      message: "Task updated successfully.",
      task: updatedTask,
    });
  }),
);

module.exports = { taskRouter: router };
