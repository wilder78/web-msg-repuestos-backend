import { Router } from "express";
import { blockClientes } from "../middleware/auth.middleware.js";

// --- Importaciones de Seguridad y Usuarios ---
import userRoutes from "./user.routes.js";
import rolRoutes from "./rol.routes.js";
import permissionRoutes from "./permission.routes.js";
import rolePermissionRoutes from "./rolePermission.routes.js";

// --- Importaciones de Maestros / Tablas de Referencia ---
import tipoDocumentoRoutes from "./documentType.routes.js";
import zonaRoutes from "./zona.routes.js";
import categoryRoutes from "./category.routes.js";
// NUEVO: Importaciones Geográficas
import departmentRoutes from "./departments.routes.js";
import municipalityRoutes from "./municipality.routes.js";

// --- Importaciones de Configuración ---
import companyRoutes from "./company.routes.js";

// --- Importaciones de Entidades de Negocio (CRUDS) ---
import employeeRoutes from "./employee.routes.js";
import supplierRoutes from "./supplier.routes.js";
import customerRoutes from "./customer.routes.js";
import creditRoutes from "./credit.routes.js";
import productRoutes from "./product.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import searchRoutes from "./search.routes.js";
import notificationRoutes from "./notification.routes.js";

// --- Importaciones de Movimientos y Transacciones ---
import shoppingRoutes from "./shopping.routes.js";
import orderRoutes from "./order.routes.js";
import saleRoutes from "./sale.routes.js";
import returnRoutes from "./return.routes.js";

// --- Importaciones de Logística ---
import rutaRoutes from "./ruta.routes.js";
import abonoRoutes from "./abono.routes.js";

const router = Router();

/**
 * ── RBAC Global ───────────────────────────────────────────────────────────────
 * blockClientes se ejecuta DESPUÉS de verifyToken (que va dentro de cada router
 * de rutas individuales). Bloquea con 403 Forbidden a cualquier usuario
 * autenticado con idRol = 4 (Cliente) antes de llegar a cualquier controlador
 * del panel administrativo.
 *
 * Las rutas públicas (/users/login, /users/register) no usan verifyToken,
 * por lo que req.user estará vacío y blockClientes simplemente llamará next().
 * ─────────────────────────────────────────────────────────────────────────────
 */
router.use(blockClientes);

/**
 * Agrupación de Rutas de la API
 * Prefijo base definido en app.js (ej: /api)
 */

// 1. SEGURIDAD Y ACCESOS
router.use("/users", userRoutes);
router.use("/roles", rolRoutes);
router.use("/permissions", permissionRoutes);
router.use("/role-permissions", rolePermissionRoutes);

// 2. MAESTROS / REFERENCIAS
router.use("/tipo-documento", tipoDocumentoRoutes);
router.use("/zonas", zonaRoutes);
router.use("/categories", categoryRoutes);
// NUEVO: Rutas Geográficas para MSG Repuestos
router.use("/departments", departmentRoutes);
router.use("/municipalities", municipalityRoutes);

// Configuración Institucional
router.use("/company", companyRoutes);

// 3. ENTIDADES DE NEGOCIO
router.use("/employees", employeeRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/customers", customerRoutes);
router.use("/credits", creditRoutes);
router.use("/products", productRoutes);
router.use("/repuestos", productRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/search", searchRoutes);
router.use("/notifications", notificationRoutes);

// 4. TRANSACCIONES (ENTRADAS, SALIDAS Y VENTAS)
router.use("/shopping", shoppingRoutes);
router.use("/orders", orderRoutes);
router.use("/sales", saleRoutes);
router.use("/returns", returnRoutes);

// 5. LOGÍSTICA
router.use("/rutas", rutaRoutes);
router.use("/abonos", abonoRoutes);

export default router;
