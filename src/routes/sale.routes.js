import { Router } from "express";
import saleController from "../controllers/sale.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware global para proteger todas las rutas de facturación
router.use(verifyToken);

// --- Endpoints de Ventas (Facturación) ---
router.get("/", saleController.getAllSales);
router.get("/top-customers", saleController.getTopCustomers);
router.get("/:id", saleController.getSaleById);

// Proceso de facturación: Convierte un Pedido en Venta
router.post("/", saleController.createSale);

export default router;
