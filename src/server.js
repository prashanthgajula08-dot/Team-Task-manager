const { databasePath } = require("./lib/db");
const { env } = require("./lib/env");
const { app } = require("./app");

app.listen(env.port, () => {
  console.log(`Team Task Manager running on port ${env.port}`);
  console.log(`Database file: ${databasePath}`);
});
