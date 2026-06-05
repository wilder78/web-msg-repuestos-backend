import db from "../models/index.model.js";

const { Permission } = db;

const permissionController = {
  // 1. Obtener todos los permisos (incluyendo el estado)
  getAllPermissions: async (req, res) => {
    try {
      const permissions = await Permission.findAll({
        attributes: [
          "idPermiso",
          "nombrePermiso",
          "modulo",
          "categoria",
          "descripcion",
          "idEstado",
        ],
        order: [
          ["categoria", "ASC"],
          ["modulo",    "ASC"],
        ],
      });
      return res.json(permissions);
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 2. Registrar un nuevo permiso
  createPermission: async (req, res) => {
    try {
      const { nombrePermiso, modulo, categoria, descripcion, idEstado } = req.body;

      // Validación de campos obligatorios
      if (!nombrePermiso || !modulo || !categoria) {
        return res.status(400).json({
          ok: false,
          message: "Los campos 'nombrePermiso', 'modulo' y 'categoria' son obligatorios.",
        });
      }

      const nuevo = await Permission.create({
        nombrePermiso: nombrePermiso.trim(),
        modulo:        modulo.trim(),
        categoria:     categoria.trim(),
        descripcion:   descripcion?.trim() ?? null,
        idEstado:      idEstado ?? 1,
      });

      return res.status(201).json({ ok: true, permission: nuevo });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 3. Actualizar la información (permite cambiar nombre, descripción, categoría o estado)
  updatePermission: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombrePermiso, modulo, categoria, descripcion, idEstado } = req.body;

      // Construir solo los campos que lleguen en la petición
      const dataToUpdate = {};
      if (nombrePermiso !== undefined) dataToUpdate.nombrePermiso = nombrePermiso.trim();
      if (modulo       !== undefined) dataToUpdate.modulo        = modulo.trim();
      if (categoria    !== undefined) dataToUpdate.categoria     = categoria.trim();
      if (descripcion  !== undefined) dataToUpdate.descripcion   = descripcion?.trim() ?? null;
      if (idEstado     !== undefined) dataToUpdate.idEstado      = idEstado;

      if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({
          ok: false,
          message: "No se enviaron campos para actualizar.",
        });
      }

      const [updatedRows] = await Permission.update(dataToUpdate, {
        where: { idPermiso: id },
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          ok: false,
          message: "Permiso no encontrado o no se detectaron cambios",
        });
      }

      return res.json({
        ok: true,
        message: "Permiso actualizado correctamente",
      });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 4. Eliminar un permiso (BORRADO FÍSICO DEFINITIVO)
  deletePermission: async (req, res) => {
    try {
      const { id } = req.params;

      // Intentamos eliminar el registro directamente
      const deleted = await Permission.destroy({
        where: { idPermiso: id },
      });

      if (deleted) {
        return res.json({
          ok: true,
          message: "Permiso eliminado físicamente de la base de datos",
        });
      } else {
        return res.status(404).json({
          ok: false,
          message: "El permiso no existe o ya fue eliminado",
        });
      }
    } catch (error) {
      // Manejo específico para errores de Llave Foránea (Foreign Key)
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(400).json({
          ok: false,
          message:
            "No se puede eliminar: Este permiso está asignado a uno o más Roles. Primero debes desvincularlo de los roles para poder borrarlo.",
        });
      }

      return res.status(500).json({
        ok: false,
        message: "Error al intentar eliminar el registro: " + error.message,
      });
    }
  },
};
export default permissionController;
