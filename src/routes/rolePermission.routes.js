import { Router } from "express";
import rolePermissionController from "../controllers/rolePermission.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware de seguridad global para la gestión de accesos
router.use(verifyToken);

// --- Endpoints de Asignación de Permisos ---

// Obtener todas las asignaciones registradas
router.get("/", rolePermissionController.getAllAssignments);

// Obtener permisos específicos de un rol por ID
router.get("/role/:idRol", rolePermissionController.getPermissionsByRole);

// Asignar un nuevo permiso a un rol
router.post("/assign", rolePermissionController.assignPermission);

// Revocar un permiso de un rol
router.delete("/revoke", rolePermissionController.revokePermission);

export default router;
