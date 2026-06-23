import { Router } from "express";
import documentTypeController from "../controllers/documentType.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// --- Endpoints de Tipos de Documento ---
router.get("/", documentTypeController.getAllTipos);

// Middleware global para proteger el resto de endpoints de tipos de documento
router.use(verifyToken);
router.get("/:id", documentTypeController.getTipoById);
router.post("/", documentTypeController.createTipo);
router.put("/:id", documentTypeController.updateTipo);
router.delete("/:id", documentTypeController.deleteTipo);

export default router;