import { Router } from "express";
import documentTypeController from "../controllers/documentType.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware global para proteger el maestro de tipos de documento
router.use(verifyToken);

// --- Endpoints de Tipos de Documento ---

router.get("/", documentTypeController.getAllTipos);
router.get("/:id", documentTypeController.getTipoById);
router.post("/", documentTypeController.createTipo);
router.put("/:id", documentTypeController.updateTipo);
router.delete("/:id", documentTypeController.deleteTipo);

export default router;