import jwt from "jsonwebtoken";

// ── ID de rol que NO puede acceder al panel administrativo
const ROL_CLIENTE = 4;

/**
 * verifyToken
 * Valida la vigencia del token JWT en todas las rutas protegidas.
 *  - 401 Unauthorized → no se envió token o el token es inválido / expirado.
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // Sin token → 401 (petición anónima)
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "No autenticado. Se requiere un token de sesión válido.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { idUsuario, idRol, iat, exp, … }
    next();
  } catch (error) {
    // Token manipulado o expirado
    return res.status(401).json({
      ok: false,
      error: "Token inválido o expirado. Por favor, inicia sesión nuevamente.",
    });
  }
};

/**
 * blockClientes  (RBAC — Control de Acceso Basado en Roles)
 * Debe aplicarse DESPUÉS de verifyToken.
 * Impide que usuarios con rol Cliente (idRol = 4) accedan a rutas
 * del panel administrativo, devolviendo 403 Forbidden.
 *
 * Uso en rutas:   router.use(verifyToken, blockClientes);
 */
export const blockClientes = (req, res, next) => {
  const idRol = req.user?.idRol;

  if (Number(idRol) === ROL_CLIENTE) {
    return res.status(403).json({
      ok: false,
      error:
        "Acceso denegado. Los usuarios con rol 'Cliente' no tienen permisos para acceder al panel administrativo.",
    });
  }

  next();
};
