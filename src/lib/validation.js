const { z } = require("zod");
const { AppError } = require("./errors");

const roleSchema = z.enum(["ADMIN", "MEMBER"]);
const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const normalizedEmail = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

const optionalText = (maxLength) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    },
    z.string().max(maxLength).optional(),
  );

const nullableText = (maxLength) =>
  z.preprocess(
    (value) => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      }
      return value;
    },
    z.union([z.string().max(maxLength), z.null(), z.undefined()]),
  );

const nullableId = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return value;
  },
  z.union([z.string().min(1), z.null(), z.undefined()]),
);

const nullableDate = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value === "") {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? "INVALID_DATE" : date;
  },
  z.union([z.date(), z.null(), z.undefined()]),
).refine((value) => value !== "INVALID_DATE", {
  message: "Enter a valid due date.",
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: normalizedEmail,
  password: z.string().min(6, "Password must be at least 6 characters.").max(72),
});

const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, "Password is required."),
});

const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters.").max(100),
  description: optionalText(500),
});

const memberSchema = z.object({
  email: normalizedEmail,
  role: roleSchema.default("MEMBER"),
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters.").max(140),
  description: optionalText(1000),
  status: taskStatusSchema.default("TODO"),
  priority: taskPrioritySchema.default("MEDIUM"),
  assigneeId: nullableId.optional(),
  dueDate: nullableDate.optional(),
});

const adminTaskUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(140).optional(),
    description: nullableText(1000).optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigneeId: nullableId.optional(),
    dueDate: nullableDate.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Provide at least one field to update.",
  });

const memberTaskUpdateSchema = z.object({
  status: taskStatusSchema,
});

function validate(schema, payload) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new AppError(400, "Validation failed.", result.error.flatten());
  }

  return result.data;
}

module.exports = {
  adminTaskUpdateSchema,
  loginSchema,
  memberSchema,
  memberTaskUpdateSchema,
  projectSchema,
  roleSchema,
  signupSchema,
  taskCreateSchema,
  taskPrioritySchema,
  taskStatusSchema,
  validate,
};
