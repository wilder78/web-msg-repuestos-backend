import { Router } from "express";
import productController from "../controllers/product.controllers.js";

const router = Router();

router.get("/summary", productController.getInventorySummary);

export default router;
