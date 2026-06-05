import { Router } from "express";
import shoppingController from "../controllers/shopping.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware global para todas las rutas de compras
router.use(verifyToken);

// --- Endpoints de Estados de Compra ---
router.get("/statuses", shoppingController.getAllStatuses);

// --- Endpoints de Compras (Maestro-Detalle) ---
router.get("/",                          shoppingController.getAllPurchases);
router.get("/history/:idProducto",       shoppingController.getProductPurchaseHistory);
router.get("/:id",                       shoppingController.getPurchaseById);
router.post("/",                         shoppingController.createPurchase);
router.put("/:id/status",               shoppingController.updatePurchaseStatus);

// Confirmar recepción: dispara el incremento de stock físico y la actualización del costo
router.patch("/confirm/:id",             shoppingController.confirmReceipt);

export default router;
