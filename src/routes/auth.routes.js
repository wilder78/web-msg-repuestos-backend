import { Router } from "express";
import { googleLogin } from "../controllers/auth.controllers.js";

const router = Router();

router.post("/google", googleLogin);

export default router;
