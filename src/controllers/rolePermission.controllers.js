import db from "../models/index.model.js";

const { RolePermission, Rol, Permission } = db;

const rolePermissionController = {
  // 1. Obtener todas las asignaciones con sus detalles y FECHA
  getAllAssignments: async (req, res) => {
    try {
      const assignments = await RolePermission.findAll({
        // Incluimos explícitamente los atributos que queremos de la tabla intermedia
        attributes: [
          "idRolesPermisos",
          "idRol",
          "idPermiso",
          "fechaAsignacion",
        ],
        include: [
          {
            model: Rol,
            as: "rol",
            // Ajustado a 'nombreRol' si seguiste la convención CamelCase del modelo
            attributes: ["nombreRol"],
          },
          {
            model: Permission,
            as: "permiso",
            attributes: ["nombrePermiso", "modulo"],
          },
        ],
        order: [["fechaAsignacion", "DESC"]], // Opcional: ver los más recientes primero
      });
      return res.json(assignments);
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 2. Asignar un permiso nuevo (La fecha se genera sola)
  assignPermission: async (req, res) => {
    try {
      const { idRol, idPermiso } = req.body;

      // Validación de datos de entrada
      if (!idRol || !idPermiso) {
        return res
          .status(400)
          .json({ message: "idRol e idPermiso son obligatorios" });
      }

      const existe = await RolePermission.findOne({
        where: { idRol, idPermiso },
      });

      if (existe) {
        return res.status(400).json({
          message: "El permiso ya está asignado a este rol",
        });
      }

      // La fechaAsignacion se registrará automáticamente por el defaultValue del modelo
      const nuevaAsignacion = await RolePermission.create({ idRol, idPermiso });

      return res.status(201).json({
        ok: true,
        message: "Permiso asignado correctamente",
        data: nuevaAsignacion,
      });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 3. Revocar (eliminar) la relación
  revokePermission: async (req, res) => {
    try {
      // Intentamos obtener de params (URL) o de body para mayor compatibilidad
      const idRol = req.params.idRol || req.body.idRol;
      const idPermiso = req.params.idPermiso || req.body.idPermiso;

      if (!idRol || !idPermiso) {
        return res.status(400).json({
          ok: false,
          message: "Se requiere idRol e idPermiso para desasignar.",
        });
      }

      const eliminado = await RolePermission.destroy({
        where: {
          idRol: idRol,
          idPermiso: idPermiso,
        },
      });

      if (eliminado) {
        return res.json({
          ok: true,
          message: "Permiso revocado correctamente",
        });
      } else {
        return res.status(404).json({
          ok: false,
          message: "La asignación no existe en la base de datos.",
        });
      }
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 4. Obtener permisos de un rol incluyendo la fecha de asignación
  getPermissionsByRole: async (req, res) => {
    try {
      const { idRol } = req.params;

      const permisos = await RolePermission.findAll({
        where: { idRol },
        attributes: ["fechaAsignacion"], // Traemos la fecha de la tabla intermedia
        include: [
          {
            model: Permission,
            as: "permiso",
            attributes: ["idPermiso", "nombrePermiso", "modulo", "descripcion"],
          },
        ],
      });

      return res.json(permisos);
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },
};

export default rolePermissionController;
