import { Router } from "express";
import {
  getMunicipalitiesByDepartment,
  getAllMunicipalities,
  seedMunicipalities,
} from "../controllers/municipality.controllers.js";

const router = Router();

/**
 * @route   GET /api/municipalities/department/:departmentId
 * @desc    Obtener ciudades filtradas por el ID del departamento
 * @access  Público (Usado en formularios de registro y checkout)
 */
router.get("/department/:departmentId", getMunicipalitiesByDepartment);

/**
 * @route   GET /api/municipalities
 * @desc    Obtener la lista completa de municipios de Colombia
 */
router.get("/", getAllMunicipalities);

/**
 * @route   POST /api/municipalities/seed
 * @desc    Poblar la tabla de municipios (Ejecutar DESPUÉS del seed de departamentos)
 * @access  Privado/Admin
 */
router.post("/seed", seedMunicipalities);

export default router;
