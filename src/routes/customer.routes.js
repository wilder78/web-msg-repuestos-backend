import { Router } from "express";
import customerController from "../controllers/customer.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware global para proteger la gestión de clientes
router.use(verifyToken);

// --- Endpoints de Clientes ---

router.get("/purchasing-history", customerController.getCustomersWithPurchases);
router.get("/email/:email", customerController.getCustomerByEmail);
router.get("/by-email", customerController.getCustomerByEmail);
router.get("/document", customerController.getCustomerByDocument);
router.get("/by-document", customerController.getCustomerByDocument);
router.get("/document/:documento", customerController.getCustomerByDocument);
router.get("/", customerController.getAllCustomers);
router.get("/:id/purchase-average", customerController.getCustomerPurchaseAverage);
router.get("/:id/historial-compras", customerController.getCustomerPurchaseHistory);
router.get("/:id", customerController.getCustomerById);
router.post("/", customerController.createCustomer);
router.put("/:id", customerController.updateCustomer);
router.delete("/:id", customerController.deleteCustomer);

export default router;
