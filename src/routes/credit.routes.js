import { Router } from "express";
import creditController from "../controllers/credit.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware global para proteger la gestión de créditos y cupos
router.use(verifyToken);

// --- Endpoints de Créditos ---

// Obtener todos los créditos registrados
router.get("/", creditController.getAllCredits);

// Resumen financiero para la tarjeta de cartera del dashboard
router.get("/portfolio-summary", creditController.getPortfolioSummary);
router.get("/cartera-summary", creditController.getCarteraSummary);

// Crear un nuevo registro de crédito para un cliente
router.post("/", creditController.createCredit);

// Actualizar el límite de crédito (Cupo) por ID
router.put("/update-limit/:id", creditController.updateCreditLimit);

// Actualizar cupo aprobado e idEstado de un crédito (edición desde el panel)
router.put("/:id", creditController.updateCredit);

// Eliminar credito
router.delete("/:id", creditController.deleteCredit);

export default router;
