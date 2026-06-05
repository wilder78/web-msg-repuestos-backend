import { Router } from "express";
import companyController from "../controllers/company.controllers.js";

const router = Router();

// Obtener datos institucionales de la empresa
router.get("/", companyController.getCompanyInfo);

export default router;
