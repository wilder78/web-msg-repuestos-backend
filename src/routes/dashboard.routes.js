import { Router } from "express";
import creditController from "../controllers/credit.controllers.js";

const router = Router();

router.get("/cartera/summary", creditController.getCarteraSummary);

export default router;
