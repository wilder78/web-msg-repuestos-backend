import { Router } from "express";
import orderController from "../controllers/order.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware global para proteger la gestión de pedidos
router.use(verifyToken);

// --- Endpoints de Pedidos y Cotizaciones ---

// Obtener listado general de pedidos y cotizaciones
router.get("/", orderController.getAllOrders);

// Obtener historial de pedidos según el usuario autenticado
router.get("/history/me", orderController.getMyOrderHistory);

// Obtener el conteo de pedidos pendientes
router.get("/pending-count", orderController.getPendingCount);

// Obtener un pedido específico por ID
router.get("/:id", orderController.getOrderById);

// Crear nueva Cotización (1) o Separación (2)
router.post("/", orderController.createOrder);
router.put("/:id", orderController.updateOrder);

// Confirmar Separación: Convierte cotización en pedido firme y descuenta stock
router.patch("/confirm-separation/:id", orderController.confirmSeparation);

export default router;
