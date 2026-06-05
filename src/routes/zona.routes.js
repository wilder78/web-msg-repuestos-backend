import { Router } from "express";
import zonaController from "../controllers/zona.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Todas las rutas de zonas requieren autenticación previa
router.use(verifyToken);

// --- Endpoints de Zonas ---
router.get("/", zonaController.getAllZonas);
router.get("/:id", zonaController.getZonaById);
router.post("/", zonaController.createZona);
router.put("/:id", zonaController.updateZona);
router.delete("/:id", zonaController.deleteZona);

export default router;
