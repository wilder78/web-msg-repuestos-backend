import db from "./src/models/index.model.js";

async function run() {
  try {
    const rolePermissions = await db.RolePermission.findAll({
      where: { idRol: 2 },
      include: [
        {
          model: db.Permission,
          as: "permiso",
          attributes: ["idPermiso", "nombrePermiso"],
        },
      ],
    });
    console.log("=== ADMIN PERMISSIONS ===");
    console.log(rolePermissions.map(rp => ({
      idRolesPermisos: rp.idRolesPermisos,
      idPermiso: rp.idPermiso,
      nombrePermiso: rp.permiso?.nombrePermiso
    })));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
run();
