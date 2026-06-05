import { Router } from "express";
import rolController from "../controllers/rol.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware de seguridad global para la gestión de roles
router.use(verifyToken);

// --- Endpoints de Roles ---

router.get("/", rolController.getAllRoles);
router.get("/:id", rolController.getRolById);
router.post("/", rolController.createRol);
router.put("/:id", rolController.updateRol);
router.delete("/:id", rolController.deleteRol);

export default router;
