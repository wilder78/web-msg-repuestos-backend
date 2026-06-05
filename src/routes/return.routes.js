import { Router } from "express";
import returnController from "../controllers/return.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware de seguridad global: Todas las rutas de devoluciones requieren login
router.use(verifyToken);

/**
 * --- Endpoints de Devoluciones (MSG Repuestos) ---
 */

// 1. Obtener todas las devoluciones registradas con sus detalles
router.get("/", returnController.getAllReturns);

// 2. Registrar nueva devolución (Inicia transacción y suma stock)
router.post("/", returnController.createReturn);

// 3. Anular devolución (Resta stock y registra auditoría de quién autorizó)
// El frontend ahora encontrará esta ruta en DELETE http://localhost:8080/api/returns/:id
router.delete("/:id", returnController.cancelReturn);

/**
 * NOTA TÉCNICA:
 * Se utiliza DELETE para mantener la semántica del botón "X" en el Frontend,
 * pero el controlador realiza una 'Anulación Lógica' (update) para no perder el historial.
 */

export default router;