import { Router } from "express";
import { 
    getDepartments, 
    getDepartmentById, 
    seedDepartments 
} from "../controllers/department.controllers.js";

const router = Router();

/**
 * @route   GET /api/departments
 * @desc    Obtener todos los departamentos para los selectores del frontend
 */
router.get("/", getDepartments);

/**
 * @route   GET /api/departments/:id
 * @desc    Obtener un departamento específico por su ID
 */
router.get("/:id", getDepartmentById);

/**
 * @route   POST /api/departments/seed
 * @desc    Ruta administrativa para poblar la base de datos inicialmente
 * @access  Privado (Deberías protegerla más adelante con un middleware de Admin)
 */
router.post("/seed", seedDepartments);

export default router;