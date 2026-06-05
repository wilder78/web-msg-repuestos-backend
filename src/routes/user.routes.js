import { Router } from "express";
import userController from "../controllers/user.controllers.js";
import profileController from "../controllers/profile.controllers.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// --- Rutas Públicas (Auth) ---
router.post("/login", userController.loginUser);
router.post("/register", userController.createUser);
router.get("/check-email/:email", userController.checkEmail);

// --- Rutas de recuperación de contraseña (Públicas) ---
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);

// --- Rutas Protegidas (Requieren Token) ---
router.use(verifyToken);

router.get("/profile", profileController.getProfile);
router.put("/profile", profileController.updateProfile);

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

export default router;
