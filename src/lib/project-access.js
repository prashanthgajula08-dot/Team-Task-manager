const { AppError } = require("./errors");
const { getProjectMembership } = require("./store");

async function requireProjectMembership(projectId, userId) {
  const membership = getProjectMembership(projectId, userId);

  if (!membership) {
    throw new AppError(403, "You do not have access to this project.");
  }

  return membership;
}

async function requireProjectAdmin(projectId, userId) {
  const membership = await requireProjectMembership(projectId, userId);

  if (membership.role !== "ADMIN") {
    throw new AppError(403, "Admin access is required for this action.");
  }

  return membership;
}

module.exports = {
  requireProjectAdmin,
  requireProjectMembership,
};
