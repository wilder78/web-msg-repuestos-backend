import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import db from "../models/index.model.js";

const { Usuario } = db;

const appClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "1008719970978-hb24n2dstb40o45up4ap9gc9kej6426q.apps.googleusercontent.com";
const client = new OAuth2Client(appClientId);

export const googleLogin = async (req, res) => {
  try {
    const { token: googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ error: "El token de Google es requerido." });
    }

    // Verificar el token usando verifyIdToken de google-auth-library
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: appClientId,
      });
    } catch (verifErr) {
      console.error("❌ Error al verificar token con google-auth-library:", verifErr.message);
      return res.status(401).json({ error: "El token de Google no es válido o ha expirado." });
    }

    const payload = ticket.getPayload();

    // Validar que el correo esté verificado por Google
    if (payload.email_verified !== true && payload.email_verified !== "true") {
      return res.status(401).json({ error: "La cuenta de Google no tiene el correo verificado." });
    }

    const email = payload.email.toLowerCase().trim();
    let user = await Usuario.findOne({
      where: { email },
      include: [
        { model: db.Rol, as: "rol", attributes: ["nombreRol"] },
        {
          model: db.Customer,
          as: "cliente",
          required: false,
          attributes: ["idCliente", "tipoCliente", "razonSocial"],
        },
      ],
    });

    if (!user) {
      // 1. Limpiar nombreUsuario de caracteres especiales
      let rawName = payload.name || payload.given_name || "Google User";
      let baseUsername = rawName.replace(/[^a-zA-Z\s]/g, "").trim();
      if (!baseUsername) baseUsername = "Usuario Google";

      // 2. Resolver colisiones de nombre de usuario en base de datos
      let finalUsername = baseUsername;
      let counter = 1;
      while (await Usuario.findOne({ where: { nombreUsuario: finalUsername } })) {
        finalUsername = `${baseUsername} ${counter}`;
        counter++;
      }

      // 3. Auto-asociar un cliente si ya existe uno registrado con este mismo email
      let idCliente = null;
      const customerMatch = await db.Customer.findOne({ where: { email } });
      if (customerMatch) {
        idCliente = customerMatch.idCliente;
      }

      // 4. Generar contraseña aleatoria inaccesible
      const tempPass = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(tempPass, 10);

      // 5. Crear el nuevo usuario (Rol 4 = Cliente, Estado 1 = Activo)
      user = await Usuario.create({
        nombreUsuario: finalUsername,
        email,
        passwordHash,
        idEstado: 1,
        idRol: 4,
        idCliente,
        isActive: true, // Auto-activado mediante la verificación de Google
      });

      // Recargar para incluir la relación 'rol' y 'cliente' si corresponden
      user = await Usuario.findByPk(user.idUsuario, {
        include: [
          { model: db.Rol, as: "rol", attributes: ["nombreRol"] },
          {
            model: db.Customer,
            as: "cliente",
            required: false,
            attributes: ["idCliente", "tipoCliente", "razonSocial"],
          },
        ],
      });
    }

    // Validar si la cuenta está bloqueada o inactiva en el sistema
    if (!user.isActive) {
      return res.status(403).json({ error: "Tu cuenta de usuario ha sido desactivada en el sistema." });
    }

    // Generar JWT del sistema
    const jwtSecret = process.env.JWT_SECRET || "msg-repuestos-dev-secret";
    const appToken = jwt.sign(
      { idUsuario: user.idUsuario, idRol: user.idRol },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES || "1h" },
    );

    // Obtener los detalles del cliente
    let idCliente = user.idCliente ?? null;
    let tipoCliente = null;

    if (Number(user.idRol) === 4) {
      if (user.cliente) {
        idCliente = user.cliente.idCliente ?? idCliente;
        tipoCliente = user.cliente.tipoCliente ?? null;
      }
      if (!idCliente || !tipoCliente) {
        const customerByEmail = await db.Customer.findOne({
          where: { email },
          attributes: ["idCliente", "tipoCliente"],
        });
        if (customerByEmail) {
          idCliente = customerByEmail.idCliente;
          tipoCliente = tipoCliente || customerByEmail.tipoCliente;
          if (!user.idCliente) {
            await user.update({ idCliente: customerByEmail.idCliente });
          }
        }
      }
    }

    // Obtener permisos del rol
    let permisosList = [];
    if (Number(user.idRol) === 1) {
      permisosList = ["*"];
    } else if (Number(user.idRol) !== 4 && Number(user.idRol) !== 7) {
      const rolePermissions = await db.RolePermission.findAll({
        where: { idRol: user.idRol },
        include: [
          {
            model: db.Permission,
            as: "permiso",
            attributes: ["nombrePermiso"],
          },
        ],
      });
      permisosList = rolePermissions
        .map(rp => rp.permiso?.nombrePermiso)
        .filter(Boolean);
    }

    const userPayload = {
      idUsuario: user.idUsuario,
      nombreUsuario: user.nombreUsuario,
      email: user.email,
      idEstado: user.idEstado,
      idRol: user.idRol,
      idCliente,
      isActive: !!user.isActive,
      is_active: !!user.isActive,
      permisos: permisosList,
      ...(tipoCliente ? { tipoCliente } : {}),
    };

    return res.status(200).json({
      message: "¡Bienvenido a MSG Repuestos!",
      token: appToken,
      user: userPayload,
    });
  } catch (error) {
    console.error("❌ Error en googleLogin controller:", error);
    return res.status(500).json({ error: "Error interno en el inicio de sesión con Google." });
  }
};

const authController = {
  googleLogin,
};

export default authController;
