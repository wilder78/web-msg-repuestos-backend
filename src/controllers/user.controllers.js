import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../models/index.model.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/emailService.js";

const { Usuario } = db;
const { Op } = db.Sequelize;

// Helper para limpiar campos sensibles
const sanitizeUser = (user) => {
  const userJson = user.toJSON ? user.toJSON() : user;
  const { passwordHash, id_rol, ...clean } = userJson;
  return clean;
};

const getRequestOrigin = (req) => {
  const origin = req.get('origin');
  if (origin) return origin;
  const referer = req.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      return url.origin;
    } catch {
      // ignore
    }
  }
  return process.env.FRONTEND_URL || "http://localhost:5173";
};

// 1. Crear un nuevo usuario
export const createUser = async (req, res) => {
  try {
    const { nombreUsuario, email, password, idEstado, idRol, idCliente } =
      req.body;

    if (!nombreUsuario || !email || !password) {
      return res.status(400).json({
        error: "Faltan campos obligatorios (nombreUsuario, email, password).",
      });
    }

    // Validar que nombreUsuario solo contenga letras y espacios
    const nombreUsuarioTrimmed = nombreUsuario.trim();
    if (!/^[a-zA-Z\s]+$/.test(nombreUsuarioTrimmed)) {
      return res.status(400).json({
        error: "El nombre de usuario solo puede contener letras y espacios.",
      });
    }

    // Verificar si el email ya existe en la base de datos
    const existingUser = await Usuario.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      if (!existingUser.isActive) {
        const tokenGenerado = crypto.randomBytes(20).toString("hex");
        existingUser.verificationToken = tokenGenerado;
        await existingUser.save();

        try {
          await sendVerificationEmail(existingUser.email, tokenGenerado, getRequestOrigin(req));
        } catch (emailError) {
          console.error("❌ Error al re-enviar el correo de verificación en registro duplicado:", emailError);
        }

        return res.status(200).json({
          message: "Este correo ya está registrado pero no ha sido activado. Se ha enviado un nuevo enlace de activación a tu correo electrónico.",
        });
      }
      return res.status(409).json({ error: "El email ya está registrado." });
    }

    // Verificar si el nombreUsuario ya existe en la base de datos
    const existingUserByName = await Usuario.findOne({
      where: { nombreUsuario: nombreUsuarioTrimmed },
    });
    if (existingUserByName) {
      return res
        .status(409)
        .json({ error: "El nombre de usuario ya está registrado." });
    }

    let finalIdCliente = idCliente || null;
    if (!finalIdCliente && email) {
      const customerMatch = await db.Customer.findOne({ where: { email: email.toLowerCase().trim() } });
      if (customerMatch) {
        finalIdCliente = customerMatch.idCliente;
      }
    }

    const tokenGenerado = crypto.randomBytes(20).toString("hex");

    // Instancia para validación de password en texto plano (RegEx del modelo)
    const userInstance = Usuario.build({
      nombreUsuario: nombreUsuarioTrimmed,
      email: email.toLowerCase().trim(),
      passwordHash: password,
      idEstado: idEstado ?? 1,
      idRol: idRol ?? 4,
      idCliente: finalIdCliente,
      verificationToken: tokenGenerado,
      isActive: false,
    });

    await userInstance.validate();

    // Hasheo post-validación
    userInstance.passwordHash = await bcrypt.hash(password, 10);
    await userInstance.save();

    try {
      const source = req.query.source || req.body.source || null;
      await sendVerificationEmail(userInstance.email, tokenGenerado, getRequestOrigin(req), source);
    } catch (emailError) {
      console.error("❌ Error al enviar el correo de verificación:", emailError);
    }

    return res.status(201).json({
      message: "Registro exitoso. Por favor, revisa tu correo electrónico para activar tu cuenta.",
    });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "El email ya está registrado." });
    }
    console.error("❌ Error en createUser:", error);
    return res.status(500).json({ error: "Error interno al crear usuario." });
  }
};

// 2. Autenticación (Login)
export const loginUser = async (req, res) => {
  try {
    const body = req.body || {};
    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await Usuario.findOne({
      where: { email: normalizedEmail },
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

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    if (Number(user.idEstado) === 2) {
      return res.status(403).json({ error: "Tu cuenta se encuentra inactiva. Comunícate con el administrador." });
    }

    if (!user.isActive) {
      const tokenGenerado = crypto.randomBytes(20).toString("hex");
      user.verificationToken = tokenGenerado;
      await user.save();

      try {
        const source = req.query.source || req.body.source || null;
        await sendVerificationEmail(user.email, tokenGenerado, getRequestOrigin(req), source);
      } catch (emailError) {
        console.error("❌ Error al re-enviar el correo de verificación en login:", emailError);
      }

      return res.status(403).json({ 
        message: "Tu cuenta no ha sido activada. Se ha enviado un nuevo enlace de activación a tu correo electrónico." 
      });
    }

    const jwtSecret = process.env.JWT_SECRET || "msg-repuestos-dev-secret";
    const token = jwt.sign(
      { idUsuario: user.idUsuario, idRol: user.idRol },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES || "1h" },
    );

    // --- Construcción del payload plano ---
    let idCliente = user.idCliente ?? null;
    let tipoCliente = null;

    if (Number(user.idRol) === 4) {
      // Caso 1: el JOIN trajo el registro de cliente correctamente
      if (user.cliente) {
        idCliente = user.cliente.idCliente ?? idCliente;
        tipoCliente = user.cliente.tipoCliente ?? null;
      }

      // Caso 2 (fallback): idCliente era null → buscar por email y auto-vincular
      if (!idCliente || !tipoCliente) {
        const customerByEmail = await db.Customer.findOne({
          where: { email: normalizedEmail },
          attributes: ["idCliente", "tipoCliente"],
        });
        if (customerByEmail) {
          idCliente = customerByEmail.idCliente;
          tipoCliente = tipoCliente || customerByEmail.tipoCliente;
          // Auto-vincular para que el próximo login no necesite el fallback
          if (!user.idCliente) {
            await user.update({ idCliente: customerByEmail.idCliente });
          }
        }
      }
    }

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
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

// 3. Obtener todos los usuarios
export const getAllUsers = async (req, res) => {
  try {
    const users = await Usuario.findAll({
      attributes: { exclude: ["passwordHash"] },
    });
    return res.status(200).json({
      data: users.map(sanitizeUser),
    });
  } catch (error) {
    console.error("❌ Error en getAllUsers:", error);
    return res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

// 4. Obtener por ID
export const getUserById = async (req, res) => {
  try {
    const user = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ["passwordHash"] },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
    return res.status(200).json({ data: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ error: "Error interno." });
  }
};

// 5. Actualizar información
export const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de usuario inválido." });
    }

    const { nombreUsuario, email, password, idEstado, idRol } = req.body;

    const user = await Usuario.findByPk(id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    // Protecciones de Usuario Master
    if (id === 1) {
      if (idEstado !== undefined && Number(idEstado) === 2) {
        return res
          .status(403)
          .json({ error: "El usuario Master debe permanecer activo." });
      }
      if (idRol !== undefined && Number(idRol) !== user.idRol) {
        return res
          .status(403)
          .json({ error: "No se permite modificar el Rol del Master." });
      }
    }

    if (password) {
      const tempUser = Usuario.build({ passwordHash: password });
      await tempUser.validate({ fields: ["passwordHash"] });
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    if (nombreUsuario !== undefined) {
      const nombreUsuarioTrimmed = String(nombreUsuario).trim();

      if (!nombreUsuarioTrimmed) {
        return res.status(400).json({ error: "El nombre de usuario es obligatorio." });
      }

      if (!/^[a-zA-Z\s]+$/.test(nombreUsuarioTrimmed)) {
        return res.status(400).json({
          error: "El nombre de usuario solo puede contener letras y espacios.",
        });
      }

      if (nombreUsuarioTrimmed !== user.nombreUsuario) {
        const existingUserByName = await Usuario.findOne({
          where: {
            nombreUsuario: nombreUsuarioTrimmed,
            idUsuario: { [Op.ne]: id },
          },
        });

        if (existingUserByName) {
          return res
            .status(409)
            .json({ error: "El nombre de usuario ya está en uso por otro empleado." });
        }

        user.nombreUsuario = nombreUsuarioTrimmed;
      }
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();

      if (!normalizedEmail) {
        return res.status(400).json({ error: "El email es obligatorio." });
      }

      if (normalizedEmail !== user.email) {
        const existingUserByEmail = await Usuario.findOne({
          where: {
            email: normalizedEmail,
            idUsuario: { [Op.ne]: id },
          },
        });

        if (existingUserByEmail) {
          return res.status(409).json({ error: "El email ya está registrado." });
        }

        user.email = normalizedEmail;
      }
    }

    if (idEstado !== undefined) user.idEstado = idEstado;
    if (idRol !== undefined) user.idRol = idRol;

    await user.save();
    return res
      .status(200)
      .json({ message: "Actualizado", data: sanitizeUser(user) });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors?.[0]?.path || "";
      if (field === "email") {
        return res.status(409).json({ error: "El email ya está registrado." });
      }
      if (field === "nombre_usuario" || field === "nombreUsuario") {
        return res.status(409).json({
          error: "El nombre de usuario ya está en uso por otro empleado.",
        });
      }
      return res.status(409).json({ error: "Ya existe un registro con esos datos." });
    }
    return res.status(500).json({ error: "Error al actualizar." });
  }
};

// 6. Eliminar usuario
export const deleteUser = async (req, res) => {
  try {
    const user = await Usuario.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "No encontrado." });

    if (user.idRol === 1) {
      return res
        .status(403)
        .json({ message: "No se puede eliminar al Master." });
    }

    await user.destroy();
    return res.status(200).json({ message: "Eliminado permanentemente." });
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res
        .status(409)
        .json({ message: "El usuario tiene historial asociado. Inactívelo." });
    }
    return res.status(500).json({ message: "Error en eliminación." });
  }
};

// 7. Verificar disponibilidad de email
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: "Email requerido." });
    const user = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });
    if (user) {
      return res.json({ disponible: false, isActive: !!user.isActive });
    }
    return res.json({ disponible: true });
  } catch (error) {
    return res.status(500).json({ error: "Error al verificar email." });
  }
};

// 8. Recuperación de contraseña (forgotPassword)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "El correo electrónico es obligatorio." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await Usuario.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      // Devolver estado 404 con un JSON estructurado de error por seguridad e integridad
      return res.status(404).json({ error: "El correo electrónico no está registrado." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await user.save();

    try {
      await sendPasswordResetEmail(user.email, token, getRequestOrigin(req));
    } catch (emailError) {
      console.error("❌ Error al enviar el correo con nodemailer:", emailError);
      // Restablecer campos en MySQL para no dejar llaves sueltas
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      return res.status(500).json({
        error: "Error al enviar el correo de recuperación.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Se ha enviado un enlace de recuperación a su correo electrónico.",
    });
  } catch (error) {
    console.error("❌ Error en forgotPassword:", error);
    return res.status(500).json({ error: "Error interno en la solicitud de recuperación." });
  }
};

// 9. Restablecer contraseña (resetPassword)
export const resetPassword = async (req, res) => {
  try {
    // Corrección de Arquitectura: Se extraen ambos parámetros directamente del cuerpo de la petición (req.body)
    const { token, nuevaContrasena } = req.body;

    if (!token || !nuevaContrasena) {
      return res.status(400).json({ error: "El token y la nueva contraseña son requeridos." });
    }

    const user = await Usuario.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "El token es inválido o ha expirado." });
    }

    // Asignar contraseña a la propiedad virtual del modelo (disparará hooks de validación y encriptación automáticos)
    user.password = nuevaContrasena;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await user.save();

    return res.status(200).json({ message: "Contraseña actualizada con éxito." });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("❌ Error en resetPassword:", error);
    return res.status(500).json({ error: "Error interno al restablecer la contraseña." });
  }
};

// 10. Verificar correo (verifyEmail)
export const verifyEmail = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "https://darkslateblue-capybara-838942.hostingersite.com";
  const isApp = req.query.source === "app";
  
  try {
    const tokenVal = req.params.token || req.query.token;

    if (!tokenVal) {
      const errorMsg = "El token de verificación es obligatorio.";
      return isApp 
        ? res.redirect(`msgrepuestos://verify?error=${encodeURIComponent(errorMsg)}`)
        : res.redirect(`${frontendUrl}/?error=${encodeURIComponent(errorMsg)}`);
    }

    const user = await Usuario.findOne({ where: { verificationToken: tokenVal } });

    if (!user) {
      const errorMsg = "Token de verificación inválido o vencido.";
      return isApp 
        ? res.redirect(`msgrepuestos://verify?error=${encodeURIComponent(errorMsg)}`)
        : res.redirect(`${frontendUrl}/?error=${encodeURIComponent(errorMsg)}`);
    }

    user.isActive = true;
    user.verificationToken = null;
    await user.save();

    return isApp 
      ? res.redirect("msgrepuestos://verify?activated=true")
      : res.redirect(`${frontendUrl}/?login=true&activated=true`);
  } catch (error) {
    console.error("❌ Error en verifyEmail:", error);
    const errorMsg = "Error interno al verificar la cuenta.";
    return isApp 
      ? res.redirect(`msgrepuestos://verify?error=${encodeURIComponent(errorMsg)}`)
      : res.redirect(`${frontendUrl}/?error=${encodeURIComponent(errorMsg)}`);
  }
};

const userController = {
  createUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  checkEmail,
  forgotPassword,
  resetPassword,
  verifyEmail,
};

export default userController;
