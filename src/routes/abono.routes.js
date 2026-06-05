import { Router } from "express";
import abonoController from "../controllers/abono.controllers.js";

const router = Router();

router.get("/", abonoController.getAllAbonos);
router.post("/", abonoController.createAbono);
router.delete("/:id", abonoController.cancelAbono);

export default router;
