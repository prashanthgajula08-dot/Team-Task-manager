const path = require("path");
const cookieParser = require("cookie-parser");
const express = require("express");
const { authRouter } = require("./routes/auth.routes");
const { dashboardRouter } = require("./routes/dashboard.routes");
const { projectRouter } = require("./routes/project.routes");
const { taskRouter } = require("./routes/task.routes");
const { AppError } = require("./lib/errors");
const { requireAuth } = require("./middleware/require-auth");

const app = express();
const publicDirectory = path.resolve(__dirname, "../public");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(publicDirectory));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/projects", requireAuth, projectRouter);
app.use("/api/tasks", requireAuth, taskRouter);

app.use("/api", (_req, _res, next) => {
  next(new AppError(404, "API route not found."));
});

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(publicDirectory, "index.html"));
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message =
    statusCode === 500 ? "Something went wrong on the server." : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message,
    details: error.details || null,
  });
});

module.exports = { app };
