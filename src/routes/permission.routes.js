import { Router } from "express";
import permissionController from "../controllers/permission.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Rutas para el catálogo maestro de Permisos
 * URL Base: /api/permissions
 */

// 1. Obtener todos los permisos
router.get("/", [verifyToken], permissionController.getAllPermissions);

// 2. Crear un nuevo permiso
router.post("/", [verifyToken], permissionController.createPermission);

// 3. Actualizar un permiso existente (ESTA ERA LA QUE FALTABA)
// Usamos :id como parámetro de ruta
router.put("/:id", [verifyToken], permissionController.updatePermission);

// 4. Eliminar un permiso (Opcional, pero recomendado para el CRUD)
router.delete("/:id", [verifyToken], permissionController.deletePermission);

export default router;