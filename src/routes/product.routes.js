import { Router } from "express";
import productController from "../controllers/product.controllers.js"; // ✅ verifica que el archivo se llame exactamente así
import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.js"; // ✅ ya centralizado aquí, correcto

const router = Router();

// --- Endpoints Públicos ---
router.get("/", productController.getAllProducts);
router.get("/inventory-summary", productController.getInventorySummary);
router.get("/inventory", productController.getInventoryList);
router.get("/brands", productController.getProductBrands);
router.get("/latest", productController.getProductLatest);
router.get("/home/top-repuestos", productController.getProductHomeTopRepuestos);
router.get("/home/top-accesorios", productController.getProductHomeTopAccesorios);
router.get("/all-list", productController.getAllProductsList);
router.get("/:id", productController.getProductById);

// --- Endpoints Privados ---
router.post(
  "/",
  verifyToken,
  upload.single("imagen"),
  productController.createProduct,
);
router.put(
  "/:id",
  verifyToken,
  upload.single("imagen"),
  productController.updateProduct,
);
router.delete("/:id", verifyToken, productController.deleteProduct);

export default router;
