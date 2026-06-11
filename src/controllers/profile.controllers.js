import db from "../models/index.model.js";

const { Usuario, Customer, Empleado, Rol, Municipality } = db;

export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.idUsuario;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    const user = await Usuario.findByPk(userId, {
      include: [
        { model: Rol, as: "rol" },
        {
          model: Customer,
          as: "cliente",
          include: [{ model: Municipality, as: "municipio" }]
        },
        { model: Empleado, as: "empleado" }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const roleName = user.rol?.nombreRol?.toLowerCase() || "";

    let profileData = {
      nombre: user.nombreUsuario,
      telefono: "",
      direccion: "",
      municipio: ""
    };

    if (roleName === "cliente" && user.cliente) {
      profileData.nombre = user.cliente.razonSocial;
      profileData.telefono = user.cliente.telefono || "";
      profileData.direccion = user.cliente.direccion || "";
      profileData.municipio = user.cliente.municipio?.name || "";
      profileData.municipioId = user.cliente.municipioId || null;
    } else if (user.empleado) {
      profileData.nombre = `${user.empleado.nombre} ${user.empleado.apellido}`.trim();
      profileData.telefono = user.empleado.telefono || "";
      profileData.direccion = "";
      profileData.municipio = "";
      profileData.idTipoDocumento = user.empleado.idTipoDocumento || "";
      profileData.numeroDocumento = user.empleado.numeroDocumento || "";
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

    return res.status(200).json({
      status: "success",
      userId,
      role: roleName,
      permisos: permisosList,
      data: profileData
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return res.status(500).json({ error: "Error al obtener perfil" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.idUsuario;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    const { nombre, telefono, direccion, municipioId, idTipoDocumento, id_tipo_documento, numeroDocumento, numero_documento } = req.body;

    const user = await Usuario.findByPk(userId, {
      include: [
        { model: Rol, as: "rol" },
        { model: Customer, as: "cliente" },
        { model: Empleado, as: "empleado" }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const roleName = user.rol?.nombreRol?.toLowerCase() || "";

    if (roleName === "cliente") {
      if (!user.cliente) {
        return res.status(404).json({ error: "Registro de cliente no asociado a este usuario." });
      }

      await user.cliente.update({
        ...(nombre !== undefined && { razonSocial: nombre }),
        ...(telefono !== undefined && { telefono }),
        ...(direccion !== undefined && { direccion }),
        ...(municipioId !== undefined && { municipioId })
      });
    } else if (roleName === "vendedor" || roleName === "administrador" || roleName === "master") {
      if (user.empleado) {
        let finalNombre = nombre;
        let finalApellido = user.empleado.apellido;

        if (nombre !== undefined) {
          const parts = nombre.trim().split(/\s+/);
          if (parts.length > 1) {
            finalNombre = parts[0];
            finalApellido = parts.slice(1).join(" ");
          } else {
            finalNombre = nombre;
            finalApellido = "";
          }
        }

        const tipoDoc = idTipoDocumento ?? id_tipo_documento;
        const numDoc = numeroDocumento ?? numero_documento;

        await user.empleado.update({
          ...(nombre !== undefined && { nombre: finalNombre, apellido: finalApellido }),
          ...(telefono !== undefined && { telefono }),
          ...(tipoDoc !== undefined && { idTipoDocumento: tipoDoc }),
          ...(numDoc !== undefined && { numeroDocumento: numDoc })
        });
      }

      if (nombre !== undefined) {
        await user.update(
          { nombreUsuario: nombre.trim().substring(0, 50) },
          { fields: ["nombreUsuario"] }
        );
      }
    } else {
      if (nombre !== undefined) {
        await user.update(
          { nombreUsuario: nombre.trim().substring(0, 50) },
          { fields: ["nombreUsuario"] }
        );
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Perfil actualizado correctamente."
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return res.status(500).json({ error: "Error al actualizar perfil" });
  }
};

const profileController = {
  getProfile,
  updateProfile
};

export default profileController;
