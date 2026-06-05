import { Router } from "express";
import searchController from "../controllers/search.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyToken);

router.get("/global", searchController.globalSearch);

export default router;
