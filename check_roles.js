import db from "./src/models/index.model.js";

async function run() {
  try {
    const roles = await db.Rol.findAll({ raw: true });
    console.log("=== ROLES ===");
    console.log(JSON.stringify(roles, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
run();
