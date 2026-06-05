import { Router } from "express";
import employeeController from "../controllers/employee.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Middleware global: Todas las rutas de empleados requieren token JWT
router.use(verifyToken);

// --- Endpoints de Empleados ---

router.post("/", employeeController.create);
router.get("/", employeeController.findAll);
router.get("/:id", employeeController.findOne);
router.put("/:id", employeeController.update);
router.delete("/:id", employeeController.delete);

export default router;