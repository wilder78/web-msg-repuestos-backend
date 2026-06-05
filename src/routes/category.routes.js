import { Router } from "express";
import categoryController from "../controllers/category.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// --- Endpoints de Categorías ---

// Obtener todas las categorías (Público)
router.get("/", categoryController.getAllCategories);

// Obtener una categoría por ID (Público)
router.get("/:id", categoryController.getCategoryById);

// Middleware global para proteger las operaciones de modificación
router.use(verifyToken);

// Registrar una nueva categoría
router.post("/", categoryController.createCategory);

// Actualizar datos de una categoría
router.put("/:id", categoryController.updateCategory);

// Desactivar categoría (Borrado lógico: activo = 0)
router.delete("/:id", categoryController.deleteCategory);

export default router;
