const path = require("path");

require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
  quiet: true,
});

const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret",
  databaseUrl: process.env.DATABASE_URL || "file:./data/team-task-manager.db",
};

if (env.nodeEnv === "production" && env.jwtSecret === "development-only-secret") {
  throw new Error("JWT_SECRET must be set in production.");
}

module.exports = { env };
