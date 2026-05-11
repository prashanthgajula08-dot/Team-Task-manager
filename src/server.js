const { databasePath } = require("./lib/db");
const { ensureDemoData } = require("./lib/demo-data");
const { env } = require("./lib/env");
const { app } = require("./app");

async function startServer() {
  await ensureDemoData();

  app.listen(env.port, () => {
    console.log(`Team Task Manager running on port ${env.port}`);
    console.log(`Database file: ${databasePath}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Team Task Manager.");
  console.error(error);
  process.exit(1);
});
