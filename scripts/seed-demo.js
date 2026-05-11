require("../src/lib/env");
const { ensureDemoData } = require("../src/lib/demo-data");

async function main() {
  await ensureDemoData();
  console.log("Demo data created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
