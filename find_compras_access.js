import db from "./src/models/index.model.js";

async function run() {
  try {
    const permissions = await db.Permission.findAll({
      raw: true
    });
    console.log("=== ALL PERMISSIONS ===");
    console.log(permissions.map(p => ({ id: p.idPermiso || p.id, nombre: p.nombrePermiso })));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
run();
