import db from "./src/models/index.model.js";

async function run() {
  try {
    const users = await db.Usuario.findAll({
      limit: 10,
      raw: true
    });
    console.log("=== USERS ===");
    console.log(users);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
run();
